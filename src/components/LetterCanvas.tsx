import { useEffect, useRef, useState } from 'react';
import type { Letter, Material, Point, Stroke } from '../types';

interface Props {
  letter: Letter;
  material: Material;
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
}

function upperPath(letter: Letter, left: number, top: number, width: number, height: number) {
  const path = new Path2D();

  if (letter === 'A') {
    path.moveTo(left + width * .13, top + height * .88);
    path.lineTo(left + width * .5, top + height * .08);
    path.lineTo(left + width * .87, top + height * .88);
    path.moveTo(left + width * .27, top + height * .58);
    path.lineTo(left + width * .73, top + height * .58);
  } else if (letter === 'B') {
    path.moveTo(left + width * .22, top + height * .08);
    path.lineTo(left + width * .22, top + height * .9);
    path.moveTo(left + width * .22, top + height * .09);
    path.bezierCurveTo(left + width * .83, top + height * .04, left + width * .86, top + height * .48, left + width * .22, top + height * .49);
    path.moveTo(left + width * .22, top + height * .49);
    path.bezierCurveTo(left + width * .9, top + height * .47, left + width * .88, top + height * .94, left + width * .22, top + height * .9);
  } else {
    path.moveTo(left + width * .82, top + height * .2);
    path.bezierCurveTo(left + width * .55, top - height * .02, left + width * .12, top + height * .12, left + width * .12, top + height * .5);
    path.bezierCurveTo(left + width * .12, top + height * .88, left + width * .55, top + height * 1.02, left + width * .82, top + height * .8);
  }

  return path;
}

function lowerPath(letter: Letter, left: number, top: number, width: number, height: number) {
  const path = new Path2D();

  if (letter === 'A') {
    path.moveTo(left + width * .72, top + height * .31);
    path.bezierCurveTo(left + width * .57, top + height * .1, left + width * .19, top + height * .18, left + width * .18, top + height * .55);
    path.bezierCurveTo(left + width * .18, top + height * .91, left + width * .58, top + height * .98, left + width * .72, top + height * .7);
    path.moveTo(left + width * .72, top + height * .31);
    path.lineTo(left + width * .72, top + height * .9);
  } else if (letter === 'B') {
    path.moveTo(left + width * .24, top + height * .02);
    path.lineTo(left + width * .24, top + height * .9);
    path.moveTo(left + width * .24, top + height * .45);
    path.bezierCurveTo(left + width * .42, top + height * .18, left + width * .8, top + height * .27, left + width * .8, top + height * .61);
    path.bezierCurveTo(left + width * .8, top + height * .94, left + width * .43, top + height * 1.01, left + width * .24, top + height * .77);
  } else {
    path.moveTo(left + width * .8, top + height * .37);
    path.bezierCurveTo(left + width * .57, top + height * .15, left + width * .17, top + height * .26, left + width * .17, top + height * .61);
    path.bezierCurveTo(left + width * .17, top + height * .94, left + width * .57, top + height * 1.02, left + width * .8, top + height * .79);
  }

  return path;
}

function drawLetters(context: CanvasRenderingContext2D, letter: Letter, width: number, height: number) {
  const guideWidth = Math.max(4, Math.min(width, height) * .007);
  const cellWidth = width * .38;
  const top = height * .1;
  const pathHeight = height * .78;
  const uppercase = upperPath(letter, width * .07, top, cellWidth, pathHeight);
  const lowercase = lowerPath(letter, width * .55, top + pathHeight * .08, cellWidth, pathHeight * .9);

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = 'rgba(255,255,255,.9)';
  context.lineWidth = guideWidth * 2.7;
  context.stroke(uppercase);
  context.stroke(lowercase);
  context.strokeStyle = 'rgba(76,68,59,.56)';
  context.lineWidth = guideWidth;
  context.stroke(uppercase);
  context.stroke(lowercase);
  context.restore();
}

function smoothPath(context: CanvasRenderingContext2D, points: Point[], width: number, height: number) {
  context.beginPath();
  const first = points[0];
  context.moveTo(first.x * width, first.y * height);

  if (points.length === 1) {
    context.lineTo(first.x * width + .01, first.y * height + .01);
    return;
  }

  for (let index = 1; index < points.length - 1; index++) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) * width * .5;
    const midY = (current.y + next.y) * height * .5;
    context.quadraticCurveTo(current.x * width, current.y * height, midX, midY);
  }

  const last = points[points.length - 1];
  context.lineTo(last.x * width, last.y * height);
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function random(seed: number) {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

function drawWater(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number) {
  smoothPath(context, points, width, height);
  context.lineWidth = size * 1.18;
  context.strokeStyle = 'rgba(17,92,154,.48)';
  context.shadowColor = 'rgba(42,174,243,.55)';
  context.shadowBlur = size * .45;
  context.stroke();

  smoothPath(context, points, width, height);
  const water = context.createLinearGradient(0, 0, width, height);
  water.addColorStop(0, '#9be9ff');
  water.addColorStop(.45, '#2bb8ee');
  water.addColorStop(1, '#087bc4');
  context.lineWidth = size * .84;
  context.strokeStyle = water;
  context.shadowBlur = 0;
  context.stroke();

  smoothPath(context, points, width, height);
  context.lineWidth = Math.max(2, size * .13);
  context.strokeStyle = 'rgba(239,252,255,.88)';
  context.setLineDash([size * .65, size * .72]);
  context.lineDashOffset = -(hash(stroke.id) % Math.max(1, Math.round(size)));
  context.stroke();
  context.setLineDash([]);

  const seed = hash(stroke.id);
  for (let index = 2; index < points.length; index += 7) {
    const point = points[index];
    const radius = size * (.08 + random(seed + index) * .08);
    context.beginPath();
    context.arc(point.x * width + (random(seed + index * 3) - .5) * size * .45, point.y * height + (random(seed + index * 5) - .5) * size * .4, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(232,251,255,.75)';
    context.lineWidth = Math.max(1.5, size * .06);
    context.stroke();
  }
}

function drawStone(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number) {
  smoothPath(context, points, width, height);
  context.lineWidth = size * 1.14;
  context.strokeStyle = '#373735';
  context.stroke();

  smoothPath(context, points, width, height);
  context.lineWidth = size * .88;
  context.strokeStyle = '#7b756d';
  context.stroke();

  const seed = hash(stroke.id);
  for (let index = 1; index < points.length; index += 3) {
    const point = points[index];
    const x = point.x * width + (random(seed + index * 11) - .5) * size * .55;
    const y = point.y * height + (random(seed + index * 17) - .5) * size * .55;
    const radius = size * (.07 + random(seed + index * 23) * .13);

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = index % 2 ? '#c1b8aa' : '#57534d';
    context.fill();

    if (index % 6 === 1) {
      context.beginPath();
      context.moveTo(x - radius * 1.2, y - radius * .3);
      context.lineTo(x + radius * .15, y + radius * .15);
      context.lineTo(x + radius * 1.1, y - radius * .7);
      context.strokeStyle = 'rgba(20,20,19,.85)';
      context.lineWidth = Math.max(1.5, size * .055);
      context.stroke();
    }
  }
}

function drawVolcano(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number) {
  smoothPath(context, points, width, height);
  context.lineWidth = size * 1.22;
  context.strokeStyle = '#2b2522';
  context.stroke();

  smoothPath(context, points, width, height);
  const volcano = context.createLinearGradient(0, height * .1, 0, height * .9);
  volcano.addColorStop(0, '#fff06a');
  volcano.addColorStop(.13, '#ff9d1e');
  volcano.addColorStop(.28, '#ed4319');
  volcano.addColorStop(.46, '#8b3425');
  volcano.addColorStop(.64, '#5f5148');
  volcano.addColorStop(1, '#302d2a');
  context.lineWidth = size * .94;
  context.strokeStyle = volcano;
  context.stroke();

  const seed = hash(stroke.id);
  points.forEach((point, index) => {
    if (index % 4)
      return;

    const x = point.x * width + (random(seed + index * 13) - .5) * size * .42;
    const y = point.y * height + (random(seed + index * 19) - .5) * size * .42;

    if (point.y < .46) {
      context.beginPath();
      context.arc(x, y, size * (.08 + random(seed + index * 29) * .1), 0, Math.PI * 2);
      context.fillStyle = point.y < .28 ? '#fff36b' : '#ff7b1b';
      context.shadowColor = '#ff5b17';
      context.shadowBlur = size * .28;
      context.fill();
      context.shadowBlur = 0;
    } else {
      context.beginPath();
      context.moveTo(x - size * .12, y - size * .08);
      context.lineTo(x, y + size * .04);
      context.lineTo(x + size * .14, y - size * .12);
      context.strokeStyle = index % 8 ? 'rgba(24,22,21,.82)' : 'rgba(181,160,139,.72)';
      context.lineWidth = Math.max(1.5, size * .06);
      context.stroke();
    }
  });
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
  const size = Math.max(18, Math.min(width, height) * .038);

  for (const points of stroke.segments) {
    if (!points.length)
      continue;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (stroke.material === 'water')
      drawWater(context, stroke, points, width, height, size);
    else if (stroke.material === 'stone')
      drawStone(context, stroke, points, width, height, size);
    else
      drawVolcano(context, stroke, points, width, height, size);

    context.restore();
  }
}

export function LetterCanvas({ letter, material, strokes, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
      setSize({ width: canvas.width, height: canvas.height });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;

    const context = canvas.getContext('2d');
    if (!context)
      return;

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#fffefb');
    background.addColorStop(1, '#fff8ea');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.save();
    context.setLineDash([10, 18]);
    context.strokeStyle = 'rgba(126,112,91,.13)';
    context.lineWidth = Math.max(2, width * .0025);
    context.beginPath();
    context.moveTo(width / 2, height * .12);
    context.lineTo(width / 2, height * .9);
    context.stroke();
    context.restore();

    drawLetters(context, letter, width, height);
    strokes.forEach(stroke => drawStroke(context, stroke, width, height));
    if (draft)
      drawStroke(context, draft, width, height);
  }, [letter, strokes, draft, size]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    setDraft({ id: crypto.randomUUID(), material, segments: [[pointFromEvent(event)]] });
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId)
      return;

    const point = pointFromEvent(event);
    setDraft(current => {
      if (!current)
        return current;

      const points = current.segments[0];
      const last = points[points.length - 1];
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < .002)
        return current;

      return { ...current, segments: [[...points, point]] };
    });
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId)
      return;

    activePointer.current = null;
    setDraft(current => {
      if (current?.segments[0]?.length)
        onChange([...strokes, current]);
      return null;
    });
  }

  return <canvas ref={canvasRef} className="letter-canvas" aria-label={`Frit tegneområde med ${letter} og ${letter.toLowerCase()}`} onContextMenu={event => event.preventDefault()} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finish} onPointerCancel={finish} />;
}
