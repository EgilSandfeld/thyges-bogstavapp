import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type {
  BrushOptions,
  Letter,
  Material,
  Point,
  Sticker,
  StickerKind,
  Stroke,
  TreeOptions
} from '../types';
import { getLetterPaths, strokeLetterPaths } from './glyphs';
import { random, renderCanvas, stickerRadius } from './materials';

interface Props {
  letter: Letter;
  material: Material;
  selectedSticker: StickerKind | null;
  strokes: Stroke[];
  stickers: Sticker[];
  brushOptions?: BrushOptions;
  treeOptions?: TreeOptions;
  canDraw: boolean;
  onStrokesChange: (strokes: Stroke[]) => void;
  onStickerAdd: (sticker: Sticker) => void;
}

interface Viewport {
  width: number;
  height: number;
}

const brushPreviewColors: Record<BrushOptions['color'], string> = {
  pink: '#f18bc3',
  purple: '#8e63d7',
  red: '#e54848',
  blue: '#278bd4',
  yellow: '#f5c842',
  green: '#56a94c',
  black: '#2b2b2b'
};

function createStroke(material: Material, brushOptions?: BrushOptions, treeOptions?: TreeOptions): Stroke {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    material,
    brush: material === 'brush' ? brushOptions : undefined,
    tree: material === 'tree' ? treeOptions : undefined,
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
  brushOptions,
  treeOptions,
  canDraw,
  onStrokesChange,
  onStickerAdd
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const maskPixelsRef = useRef<ImageData | null>(null);
  const activePointer = useRef<number | null>(null);
  const lastPointer = useRef<Point | null>(null);
  const lastPreviewPoint = useRef<Point | null>(null);
  const draftRef = useRef<Stroke | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 1, height: 1 });

  const pixelWidth = viewport.width;
  const pixelHeight = viewport.height;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host)
      return;

    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = Math.max(1, Math.round(host.clientWidth));
        const height = Math.max(1, Math.round(host.clientHeight));
        setViewport(current => current.width === width && current.height === height
          ? current
          : { width, height });
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const mask = maskRef.current;
    if (mask.width !== pixelWidth)
      mask.width = pixelWidth;
    if (mask.height !== pixelHeight)
      mask.height = pixelHeight;

    const maskContext = mask.getContext('2d', { willReadFrequently: true });
    if (!maskContext || pixelWidth < 2 || pixelHeight < 2)
      return;

    const paths = getLetterPaths(letter, pixelWidth, pixelHeight);
    maskContext.clearRect(0, 0, pixelWidth, pixelHeight);
    strokeLetterPaths(maskContext, paths, paths.toleranceWidth, '#ffffff');

    maskContext.fillStyle = '#ffffff';
    for (const sticker of stickers) {
      const radius = stickerRadius(pixelWidth, pixelHeight, sticker) * 1.22;
      maskContext.beginPath();
      maskContext.arc(sticker.x * pixelWidth, sticker.y * pixelHeight, radius, 0, Math.PI * 2);
      maskContext.fill();
    }

    maskPixelsRef.current = maskContext.getImageData(0, 0, pixelWidth, pixelHeight);
  }, [letter, pixelHeight, pixelWidth, stickers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview || pixelWidth < 2 || pixelHeight < 2)
      return;

    renderCanvas(canvas, maskRef.current, letter, strokes, stickers, null);
    preview.getContext('2d')?.clearRect(0, 0, preview.width, preview.height);
  }, [letter, pixelHeight, pixelWidth, stickers, strokes]);

  useEffect(() => {
    draftRef.current = null;
    activePointer.current = null;
    lastPointer.current = null;
    lastPreviewPoint.current = null;
  }, [letter]);

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const canvas = previewRef.current!;
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

    const px = Math.max(0, Math.min(mask.width - 1, Math.round(point.x * (mask.width - 1))));
    const py = Math.max(0, Math.min(mask.height - 1, Math.round(point.y * (mask.height - 1))));
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
    if (!stroke.segments.length)
      stroke.segments.push([]);

    for (const point of samples) {
      const current = stroke.segments[stroke.segments.length - 1];
      if (allowed(point)) {
        const previous = current[current.length - 1];
        if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= .0015)
          current.push(point);
      } else if (current.length) {
        stroke.segments.push([]);
      }
    }
  }

  function previewStyle(context: CanvasRenderingContext2D) {
    const minimum = Math.min(pixelWidth, pixelHeight);
    context.lineJoin = 'round';
    context.lineCap = material === 'brush' && brushOptions?.shape === 'flat' ? 'square' : 'round';

    if (material === 'brush') {
      context.strokeStyle = brushPreviewColors[brushOptions?.color ?? 'blue'];
      context.fillStyle = context.strokeStyle;
      context.lineWidth = brushOptions?.size === 'small'
        ? Math.max(10, minimum * .024)
        : brushOptions?.size === 'large'
          ? Math.max(28, minimum * .072)
          : Math.max(18, minimum * .045);
      return;
    }

    context.lineWidth = Math.max(18, minimum * .04);
    context.strokeStyle = material === 'water'
      ? 'rgba(42,148,187,.84)'
      : material === 'stone'
        ? 'rgba(116,112,104,.9)'
        : material === 'volcano'
          ? 'rgba(226,77,25,.9)'
          : 'rgba(72,132,65,.88)';
    context.fillStyle = context.strokeStyle;
  }

  function drawPreview(samples: Point[]) {
    const preview = previewRef.current;
    if (!preview)
      return;

    const context = preview.getContext('2d');
    if (!context)
      return;

    context.save();
    previewStyle(context);

    for (const point of samples) {
      if (!allowed(point)) {
        lastPreviewPoint.current = null;
        continue;
      }

      const x = point.x * preview.width;
      const y = point.y * preview.height;
      const previous = lastPreviewPoint.current;
      context.beginPath();
      if (previous) {
        context.moveTo(previous.x * preview.width, previous.y * preview.height);
        context.lineTo(x, y);
        context.stroke();
      } else {
        context.arc(x, y, context.lineWidth * .5, 0, Math.PI * 2);
        context.fill();
      }
      lastPreviewPoint.current = point;
    }
    context.restore();

    context.save();
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(maskRef.current, 0, 0);
    context.restore();
  }

  function clearPreview() {
    const preview = previewRef.current;
    if (preview)
      preview.getContext('2d')?.clearRect(0, 0, preview.width, preview.height);
    lastPreviewPoint.current = null;
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

    if (!canDraw)
      return;

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    lastPointer.current = point;
    clearPreview();

    const draft = createStroke(material, brushOptions, treeOptions);
    draftRef.current = draft;
    appendSamples(draft, [point]);
    drawPreview([point]);
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (selectedSticker || activePointer.current !== event.pointerId)
      return;

    const draft = draftRef.current;
    if (!draft)
      return;

    const point = pointFromEvent(event);
    const previous = lastPointer.current ?? point;
    lastPointer.current = point;
    const samples = samplesBetween(previous, point);
    appendSamples(draft, samples);
    drawPreview(samples);
  }

  function finish(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId)
      return;

    activePointer.current = null;
    lastPointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);

    const draft = draftRef.current;
    draftRef.current = null;
    if (!draft) {
      clearPreview();
      return;
    }

    const segments = draft.segments.filter(segment => segment.length);
    if (!segments.length) {
      clearPreview();
      return;
    }

    const completed = { ...draft, segments };
    const nextStrokes = [...strokes, completed];
    const canvas = canvasRef.current;
    if (canvas)
      renderCanvas(canvas, maskRef.current, letter, nextStrokes, stickers, null);
    clearPreview();
    onStrokesChange(nextStrokes);
  }

  return (
    <div ref={hostRef} className="canvas-host">
      <canvas
        ref={canvasRef}
        width={pixelWidth}
        height={pixelHeight}
        className="letter-canvas letter-canvas-base"
        aria-hidden="true"
      />
      <canvas
        ref={previewRef}
        width={pixelWidth}
        height={pixelHeight}
        className={`letter-canvas letter-canvas-preview ${selectedSticker ? 'is-sticker-mode' : ''} ${!selectedSticker && !canDraw ? 'is-disabled' : ''}`}
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
