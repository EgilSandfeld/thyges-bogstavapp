import { useEffect, useRef, useState } from 'react';
import type { Letter, Material, Point, Stroke } from '../types';

interface Props {
  letter: Letter;
  material: Material;
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
}

function drawLetters(context: CanvasRenderingContext2D, letter: Letter, width: number, height: number, color: string, lineWidth: number) {
  context.save();
  context.font = `900 ${Math.floor(height * 0.63)}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.strokeText(letter, width * 0.27, height * 0.53);
  context.strokeText(letter.toLowerCase(), width * 0.73, height * 0.53);
  context.restore();
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
  const size = Math.max(14, Math.min(width, height) * 0.035);

  for (const segment of stroke.segments) {
    if (!segment.length)
      continue;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    segment.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (!index)
        context.moveTo(x, y);
      else
        context.lineTo(x, y);
    });

    if (stroke.material === 'water') {
      context.lineWidth = size;
      context.strokeStyle = 'rgba(36, 151, 231, .62)';
      context.shadowColor = 'rgba(87, 202, 255, .7)';
      context.shadowBlur = size * .45;
      context.stroke();
    } else if (stroke.material === 'stone') {
      context.lineWidth = size;
      context.strokeStyle = '#84786b';
      context.stroke();
      context.lineWidth = size * .35;
      context.strokeStyle = 'rgba(218, 207, 190, .8)';
      context.setLineDash([2, 10]);
      context.stroke();
    } else {
      context.lineWidth = size * 1.1;
      context.strokeStyle = '#6c2016';
      context.stroke();
      context.lineWidth = size * .7;
      context.strokeStyle = '#f14b18';
      context.stroke();
      context.lineWidth = size * .22;
      context.strokeStyle = '#ffcb2d';
      context.stroke();
    }
    context.restore();
  }
}

export function LetterCanvas({ letter, material, strokes, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const activePointer = useRef<number | null>(null);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      maskRef.current.width = canvas.width;
      maskRef.current.height = canvas.height;
      setSize({ width: canvas.width, height: canvas.height });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mask = maskRef.current;
    if (!canvas)
      return;

    const context = canvas.getContext('2d');
    const maskContext = mask.getContext('2d', { willReadFrequently: true });
    if (!context || !maskContext)
      return;

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#fffefb');
    gradient.addColorStop(1, '#fff8ea');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.save();
    context.setLineDash([10, 18]);
    context.strokeStyle = 'rgba(126, 112, 91, .16)';
    context.lineWidth = Math.max(2, width * .0025);
    context.beginPath();
    context.moveTo(width / 2, height * .14);
    context.lineTo(width / 2, height * .88);
    context.stroke();
    context.restore();

    const guideWidth = Math.max(6, Math.min(width, height) * .018);
    drawLetters(context, letter, width, height, 'rgba(83, 72, 58, .55)', guideWidth);

    maskContext.clearRect(0, 0, width, height);
    drawLetters(maskContext, letter, width, height, '#000', guideWidth * 5.5);

    strokes.forEach(stroke => drawStroke(context, stroke, width, height));
    if (draft)
      drawStroke(context, draft, width, height);
  }, [letter, strokes, draft, size]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  }

  function allowed(point: Point) {
    const mask = maskRef.current;
    const context = mask.getContext('2d', { willReadFrequently: true });
    if (!context)
      return false;
    const x = Math.max(0, Math.min(mask.width - 1, Math.round(point.x * mask.width)));
    const y = Math.max(0, Math.min(mask.height - 1, Math.round(point.y * mask.height)));
    return context.getImageData(x, y, 1, 1).data[3] > 0;
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    const point = pointFromEvent(event);
    setDraft({ id: crypto.randomUUID(), material, segments: allowed(point) ? [[point]] : [[]] });
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId)
      return;

    const point = pointFromEvent(event);
    setDraft(current => {
      if (!current)
        return current;
      const segments = current.segments.map(segment => [...segment]);
      if (allowed(point)) {
        if (!segments.length || !segments[segments.length - 1].length)
          segments.push([]);
        segments[segments.length - 1].push(point);
      } else if (segments.length && segments[segments.length - 1].length) {
        segments.push([]);
      }
      return { ...current, segments };
    });
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId)
      return;
    activePointer.current = null;
    setDraft(current => {
      if (current) {
        const segments = current.segments.filter(segment => segment.length);
        if (segments.length)
          onChange([...strokes, { ...current, segments }]);
      }
      return null;
    });
  }

  return <canvas ref={canvasRef} className="letter-canvas" aria-label={`Tegneområde til ${letter} og ${letter.toLowerCase()}`} onContextMenu={event => event.preventDefault()} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finish} onPointerCancel={finish} />;
}
