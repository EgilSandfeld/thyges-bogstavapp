import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type {
  BrushOptions,
  CrystalOptions,
  DrawingMaterial,
  Letter,
  Point,
  Sticker,
  StickerKindV55,
  StoneOptions,
  Stroke,
  TreeOptions
} from '../types';
import { getLetterPaths, strokeLetterPaths } from './glyphs';
import { previewColor, random, renderCanvasV55, stickerRadius } from './renderingV55';

interface Props {
  letter: Letter;
  material: DrawingMaterial;
  selectedSticker: StickerKindV55 | null;
  strokes: Stroke[];
  stickers: Sticker[];
  brushOptions?: BrushOptions;
  treeOptions?: TreeOptions;
  stoneOptions?: StoneOptions;
  crystalOptions?: CrystalOptions;
  canDraw: boolean;
  onStrokesChange: (strokes: Stroke[]) => void;
  onStickerAdd: (sticker: Sticker) => void;
}

interface Viewport {
  width: number;
  height: number;
}

function createStroke(
  material: DrawingMaterial,
  brushOptions?: BrushOptions,
  treeOptions?: TreeOptions,
  stoneOptions?: StoneOptions,
  crystalOptions?: CrystalOptions
): Stroke {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    material,
    brush: material === 'brush' ? brushOptions : undefined,
    tree: material === 'tree' ? treeOptions : undefined,
    stone: material === 'stone' ? stoneOptions : undefined,
    crystal: material === 'crystal' ? crystalOptions : undefined,
    segments: [[]],
    createdAt: Date.now()
  };
}

export function LetterCanvasV55({
  letter,
  material,
  selectedSticker,
  strokes,
  stickers,
  brushOptions,
  treeOptions,
  stoneOptions,
  crystalOptions,
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

  const pixelWidth = Math.max(1, viewport.width);
  const pixelHeight = Math.max(1, viewport.height);

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

  useEffect(() => {
    const canvases = [canvasRef.current, previewRef.current, maskRef.current];
    for (const canvas of canvases) {
      if (!canvas)
        continue;
      if (canvas.width !== pixelWidth)
        canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight)
        canvas.height = pixelHeight;
    }
  }, [pixelHeight, pixelWidth]);

  useEffect(() => {
    const mask = maskRef.current;
    const context = mask.getContext('2d', { willReadFrequently: true });
    if (!context || pixelWidth < 2 || pixelHeight < 2)
      return;

    const paths = getLetterPaths(letter, pixelWidth, pixelHeight);
    context.clearRect(0, 0, pixelWidth, pixelHeight);
    strokeLetterPaths(context, paths, paths.toleranceWidth, '#ffffff');

    context.fillStyle = '#ffffff';
    for (const sticker of stickers) {
      const radius = stickerRadius(pixelWidth, pixelHeight, sticker) * 1.22;
      context.beginPath();
      context.arc(sticker.x * pixelWidth, sticker.y * pixelHeight, radius, 0, Math.PI * 2);
      context.fill();
    }

    maskPixelsRef.current = context.getImageData(0, 0, pixelWidth, pixelHeight);
  }, [letter, pixelHeight, pixelWidth, stickers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview || pixelWidth < 2 || pixelHeight < 2)
      return;

    renderCanvasV55(canvas, maskRef.current, letter, strokes, stickers);
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

    const x = Math.max(0, Math.min(mask.width - 1, Math.round(point.x * (mask.width - 1))));
    const y = Math.max(0, Math.min(mask.height - 1, Math.round(point.y * (mask.height - 1))));
    return pixels.data[(y * mask.width + x) * 4 + 3] > 0;
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

  function setPreviewStyle(context: CanvasRenderingContext2D, stroke: Stroke) {
    const minimum = Math.min(pixelWidth, pixelHeight);
    context.lineJoin = 'round';
    context.lineCap = stroke.material === 'brush' && stroke.brush?.shape === 'flat' ? 'square' : 'round';
    context.strokeStyle = previewColor(stroke);
    context.fillStyle = context.strokeStyle;

    if (stroke.material === 'brush') {
      context.lineWidth = stroke.brush?.size === 'small'
        ? Math.max(10, minimum * .024)
        : stroke.brush?.size === 'large'
          ? Math.max(28, minimum * .072)
          : Math.max(18, minimum * .045);
    } else if (stroke.material === 'tree') {
      context.lineWidth = Math.max(24, minimum * .055);
    } else {
      context.lineWidth = Math.max(18, minimum * .04);
    }
  }

  function drawPreview(samples: Point[]) {
    const preview = previewRef.current;
    const draft = draftRef.current;
    if (!preview || !draft)
      return;

    const context = preview.getContext('2d');
    if (!context)
      return;

    context.save();
    setPreviewStyle(context, draft);
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
    preview?.getContext('2d')?.clearRect(0, 0, preview.width, preview.height);
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

    const draft = createStroke(material, brushOptions, treeOptions, stoneOptions, crystalOptions);
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

    const nextStrokes = [...strokes, { ...draft, segments }];
    const canvas = canvasRef.current;
    if (canvas)
      renderCanvasV55(canvas, maskRef.current, letter, nextStrokes, stickers);
    clearPreview();
    onStrokesChange(nextStrokes);
  }

  return (
    <div ref={hostRef} className="canvas-host">
      <canvas
        ref={canvasRef}
        className="letter-canvas letter-canvas-base"
        style={{ width: viewport.width, height: viewport.height }}
        aria-hidden="true"
      />
      <canvas
        ref={previewRef}
        className={`letter-canvas letter-canvas-preview ${selectedSticker ? 'is-sticker-mode' : ''} ${!selectedSticker && !canDraw ? 'is-disabled' : ''}`}
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
