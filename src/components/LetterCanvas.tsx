import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Letter, Material, Point, Sticker, StickerKind, Stroke } from '../types';
import { getLetterPaths, strokeLetterPaths } from './glyphs';
import { random, renderCanvas } from './materials';

interface Props {
  letter: Letter;
  material: Material;
  selectedSticker: StickerKind | null;
  strokes: Stroke[];
  stickers: Sticker[];
  onStrokesChange: (strokes: Stroke[]) => void;
  onStickerAdd: (sticker: Sticker) => void;
}

interface Viewport {
  width: number;
  height: number;
}

function createStroke(material: Material): Stroke {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    material,
    segments: [[]],
    createdAt: Date.now()
  };
}

export function LetterCanvas({
  letter,
  material,
  selectedSticker,
  strokes,
  stickers,
  onStrokesChange,
  onStickerAdd
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const maskPixelsRef = useRef<ImageData | null>(null);
  const activePointer = useRef<number | null>(null);
  const lastPointer = useRef<Point | null>(null);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 1, height: 1 });
  const [pixelSize, setPixelSize] = useState<Viewport>({ width: 1, height: 1 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host)
      return;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      setViewport({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewport.width < 2 || viewport.height < 2)
      return;

    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(viewport.width * scale));
    const height = Math.max(1, Math.round(viewport.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      maskRef.current.width = width;
      maskRef.current.height = height;
      setPixelSize({ width, height });
    }

    const maskContext = maskRef.current.getContext('2d', { willReadFrequently: true });
    if (!maskContext)
      return;

    const paths = getLetterPaths(letter, width, height);
    maskContext.clearRect(0, 0, width, height);
    strokeLetterPaths(maskContext, paths, paths.toleranceWidth, '#ffffff');
    maskPixelsRef.current = maskContext.getImageData(0, 0, width, height);
    renderCanvas(canvas, maskRef.current, letter, strokes, stickers, draft);
  }, [draft, letter, stickers, strokes, viewport]);

  useEffect(() => {
    redraw();
  }, [redraw, pixelSize]);

  useEffect(() => {
    setDraft(null);
    activePointer.current = null;
    lastPointer.current = null;
  }, [letter]);

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function allowed(point: Point) {
    const pixels = maskPixelsRef.current;
    const mask = maskRef.current;
    if (!pixels || !mask.width || !mask.height)
      return false;

    const px = Math.max(0, Math.min(mask.width - 1, Math.round(point.x * mask.width)));
    const py = Math.max(0, Math.min(mask.height - 1, Math.round(point.y * mask.height)));
    return pixels.data[(py * mask.width + px) * 4 + 3] > 0;
  }

  function samplesBetween(from: Point, to: Point) {
    const mask = maskRef.current;
    const distance = Math.hypot((to.x - from.x) * mask.width, (to.y - from.y) * mask.height);
    const stepLength = Math.max(3, Math.min(mask.width, mask.height) * .006);
    const steps = Math.max(1, Math.ceil(distance / stepLength));
    const samples: Point[] = [];

    for (let step = 1; step <= steps; step++) {
      const progress = step / steps;
      samples.push({
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress
      });
    }

    return samples;
  }

  function appendSamples(stroke: Stroke, samples: Point[]) {
    const segments = stroke.segments.map(segment => [...segment]);
    if (!segments.length)
      segments.push([]);

    for (const point of samples) {
      const current = segments[segments.length - 1];
      if (allowed(point)) {
        const previous = current[current.length - 1];
        if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= .0015)
          current.push(point);
      } else if (current.length) {
        segments.push([]);
      }
    }

    return { ...stroke, segments };
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0)
      return;

    const point = pointFromEvent(event);
    if (selectedSticker) {
      const seed = Date.now() + Math.round(point.x * 1000) + Math.round(point.y * 10000);
      onStickerAdd({
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        kind: selectedSticker,
        x: point.x,
        y: point.y,
        scale: .88 + random(seed) * .34,
        rotation: (random(seed + 17) - .5) * .44,
        createdAt: Date.now()
      });
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    lastPointer.current = point;
    setDraft(appendSamples(createStroke(material), [point]));
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (selectedSticker || activePointer.current !== event.pointerId)
      return;

    const point = pointFromEvent(event);
    const previous = lastPointer.current ?? point;
    lastPointer.current = point;
    const samples = samplesBetween(previous, point);
    setDraft(current => current ? appendSamples(current, samples) : current);
  }

  function finish(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId)
      return;

    activePointer.current = null;
    lastPointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);

    setDraft(current => {
      if (current) {
        const segments = current.segments.filter(segment => segment.length);
        if (segments.length)
          onStrokesChange([...strokes, { ...current, segments }]);
      }
      return null;
    });
  }

  return (
    <div ref={hostRef} className="canvas-host">
      <canvas
        ref={canvasRef}
        className={`letter-canvas ${selectedSticker ? 'is-sticker-mode' : ''}`}
        style={{ width: viewport.width, height: viewport.height }}
        aria-label={`Tegneområde til stort og lille ${letter}`}
        onContextMenu={event => event.preventDefault()}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
    </div>
  );
}
