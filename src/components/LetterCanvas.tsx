import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Letter, Material, Point, Stroke } from '../types';

interface Props {
  letter: Letter;
  material: Material;
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
}

interface LetterPaths {
  uppercase: Path2D;
  lowercase: Path2D;
  guideWidth: number;
  toleranceWidth: number;
}

function upperPath(letter: Letter, left: number, top: number, width: number, height: number) {
  const path = new Path2D();

  if (letter === 'A') {
    path.moveTo(left + width * .05, top + height * .9);
    path.lineTo(left + width * .5, top + height * .06);
    path.lineTo(left + width * .95, top + height * .9);
    path.moveTo(left + width * .22, top + height * .58);
    path.lineTo(left + width * .78, top + height * .58);
  } else if (letter === 'B') {
    path.moveTo(left + width * .12, top + height * .06);
    path.lineTo(left + width * .12, top + height * .91);
    path.moveTo(left + width * .12, top + height * .07);
    path.bezierCurveTo(left + width * .94, top + height * .01, left + width * .97, top + height * .47, left + width * .12, top + height * .49);
    path.moveTo(left + width * .12, top + height * .49);
    path.bezierCurveTo(left + width * .98, top + height * .46, left + width * .96, top + height * .96, left + width * .12, top + height * .91);
  } else {
    path.moveTo(left + width * .94, top + height * .18);
    path.bezierCurveTo(left + width * .62, top - height * .02, left + width * .06, top + height * .1, left + width * .06, top + height * .5);
    path.bezierCurveTo(left + width * .06, top + height * .9, left + width * .62, top + height * 1.02, left + width * .94, top + height * .82);
  }

  return path;
}

function lowerPath(letter: Letter, left: number, top: number, width: number, height: number) {
  const path = new Path2D();

  if (letter === 'A') {
    path.moveTo(left + width * .86, top + height * .3);
    path.bezierCurveTo(left + width * .69, top + height * .08, left + width * .08, top + height * .14, left + width * .08, top + height * .56);
    path.bezierCurveTo(left + width * .08, top + height * .96, left + width * .67, top + height * 1, left + width * .86, top + height * .69);
    path.moveTo(left + width * .86, top + height * .3);
    path.lineTo(left + width * .86, top + height * .92);
  } else if (letter === 'B') {
    path.moveTo(left + width * .13, top + height * .01);
    path.lineTo(left + width * .13, top + height * .92);
    path.moveTo(left + width * .13, top + height * .44);
    path.bezierCurveTo(left + width * .36, top + height * .14, left + width * .93, top + height * .22, left + width * .93, top + height * .61);
    path.bezierCurveTo(left + width * .93, top + height * .99, left + width * .37, top + height * 1.03, left + width * .13, top + height * .76);
  } else {
    path.moveTo(left + width * .94, top + height * .35);
    path.bezierCurveTo(left + width * .65, top + height * .12, left + width * .06, top + height * .22, left + width * .06, top + height * .61);
    path.bezierCurveTo(left + width * .06, top + height * .98, left + width * .65, top + height * 1.04, left + width * .94, top + height * .78);
  }

  return path;
}

function getLetterPaths(letter: Letter, width: number, height: number): LetterPaths {
  const minimum = Math.min(width, height);
  const cellWidth = width * .42;
  const top = height * .18;
  const pathHeight = height * .62;

  return {
    uppercase: upperPath(letter, width * .035, top, cellWidth, pathHeight),
    lowercase: lowerPath(letter, width * .545, top + pathHeight * .05, cellWidth, pathHeight * .94),
    guideWidth: Math.max(4, minimum * .0065),
    toleranceWidth: Math.max(28, minimum * .065)
  };
}

function strokeLetterPaths(context: CanvasRenderingContext2D, paths: LetterPaths, lineWidth: number, strokeStyle: string) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = lineWidth;
  context.strokeStyle = strokeStyle;
  context.stroke(paths.uppercase);
  context.stroke(paths.lowercase);
  context.restore();
}

function drawLetters(context: CanvasRenderingContext2D, letter: Letter, width: number, height: number) {
  const paths = getLetterPaths(letter, width, height);
  strokeLetterPaths(context, paths, paths.guideWidth * 2.6, 'rgba(255,255,255,.92)');
  strokeLetterPaths(context, paths, paths.guideWidth, 'rgba(76,68,59,.58)');
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
    context.quadraticCurveTo(
      current.x * width,
      current.y * height,
      (current.x + next.x) * width * .5,
      (current.y + next.y) * height * .5
    );
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
  const water = context.createLinearGradient(0, 0, width, height);
  water.addColorStop(0, 'rgba(115,205,225,.84)');
  water.addColorStop(.5, 'rgba(42,148,187,.82)');
  water.addColorStop(1, 'rgba(27,105,151,.84)');
  context.lineWidth = size;
  context.strokeStyle = water;
  context.stroke();

  smoothPath(context, points, width, height);
  context.lineWidth = size * .58;
  context.strokeStyle = 'rgba(91,190,218,.32)';
  context.stroke();

  const seed = hash(stroke.id);
  for (let index = 2; index < points.length; index += 5) {
    const point = points[index];
    const x = point.x * width + (random(seed + index * 7) - .5) * size * .42;
    const y = point.y * height + (random(seed + index * 11) - .5) * size * .42;
    const radiusX = size * (.13 + random(seed + index * 13) * .13);
    const radiusY = radiusX * (.22 + random(seed + index * 17) * .2);

    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, (random(seed + index * 19) - .5) * .7, Math.PI * .08, Math.PI * .92);
    context.strokeStyle = 'rgba(225,247,249,.55)';
    context.lineWidth = Math.max(1.2, size * .045);
    context.stroke();

    if (index % 10 === 2) {
      context.beginPath();
      context.ellipse(x - radiusX * .35, y + radiusY * 1.8, radiusX * .55, radiusY * .45, 0, 0, Math.PI * 2);
      context.fillStyle = 'rgba(12,91,133,.18)';
      context.fill();
    }
  }
}

function drawStone(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number) {
  smoothPath(context, points, width, height);
  const stone = context.createLinearGradient(0, 0, width, height);
  stone.addColorStop(0, 'rgba(154,150,140,.94)');
  stone.addColorStop(.52, 'rgba(116,112,104,.95)');
  stone.addColorStop(1, 'rgba(91,88,83,.94)');
  context.lineWidth = size;
  context.strokeStyle = stone;
  context.stroke();

  const seed = hash(stroke.id);
  const colors = ['rgba(185,180,168,.9)', 'rgba(125,121,113,.92)', 'rgba(92,89,84,.9)', 'rgba(151,139,123,.78)'];

  for (let index = 1; index < points.length; index += 3) {
    const point = points[index];
    const x = point.x * width + (random(seed + index * 11) - .5) * size * .58;
    const y = point.y * height + (random(seed + index * 17) - .5) * size * .58;
    const radius = size * (.08 + random(seed + index * 23) * .13);
    const vertices = 5 + Math.floor(random(seed + index * 29) * 3);

    context.beginPath();
    for (let vertex = 0; vertex < vertices; vertex++) {
      const angle = Math.PI * 2 * vertex / vertices;
      const variation = .68 + random(seed + index * 31 + vertex) * .48;
      const px = x + Math.cos(angle) * radius * variation;
      const py = y + Math.sin(angle) * radius * variation;
      if (!vertex)
        context.moveTo(px, py);
      else
        context.lineTo(px, py);
    }
    context.closePath();
    context.fillStyle = colors[Math.floor(random(seed + index * 37) * colors.length)];
    context.fill();

    if (index % 9 === 1) {
      context.beginPath();
      context.moveTo(x - radius * 1.1, y - radius * .3);
      context.lineTo(x - radius * .15, y + radius * .12);
      context.lineTo(x + radius * .95, y - radius * .62);
      context.strokeStyle = 'rgba(72,65,59,.46)';
      context.lineWidth = Math.max(1.2, size * .04);
      context.stroke();
    }
  }
}

function drawVolcano(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number) {
  smoothPath(context, points, width, height);
  const volcano = context.createLinearGradient(0, height * .12, 0, height * .88);
  volcano.addColorStop(0, 'rgba(255,205,82,.97)');
  volcano.addColorStop(.16, 'rgba(232,104,31,.97)');
  volcano.addColorStop(.34, 'rgba(153,65,43,.96)');
  volcano.addColorStop(.53, 'rgba(116,96,83,.96)');
  volcano.addColorStop(.72, 'rgba(132,125,116,.96)');
  volcano.addColorStop(1, 'rgba(101,94,87,.97)');
  context.lineWidth = size * 1.04;
  context.strokeStyle = volcano;
  context.stroke();

  const seed = hash(stroke.id);
  points.forEach((point, index) => {
    if (index % 3)
      return;

    const x = point.x * width + (random(seed + index * 13) - .5) * size * .5;
    const y = point.y * height + (random(seed + index * 19) - .5) * size * .5;

    if (point.y < .44) {
      const radius = size * (.07 + random(seed + index * 29) * .12);
      context.beginPath();
      context.ellipse(x, y, radius * 1.25, radius * .72, random(seed + index * 31) * Math.PI, 0, Math.PI * 2);
      context.fillStyle = point.y < .27 ? 'rgba(255,224,103,.92)' : 'rgba(223,83,28,.88)';
      context.shadowColor = 'rgba(226,78,25,.42)';
      context.shadowBlur = size * .2;
      context.fill();
      context.shadowBlur = 0;
    } else {
      const radius = size * (.07 + random(seed + index * 41) * .12);
      const colors = point.y < .62
        ? ['rgba(124,93,78,.9)', 'rgba(151,101,74,.76)', 'rgba(105,102,96,.9)']
        : ['rgba(146,139,128,.88)', 'rgba(103,98,91,.94)', 'rgba(125,113,100,.84)'];
      const vertices = 5 + Math.floor(random(seed + index * 43) * 3);

      context.beginPath();
      for (let vertex = 0; vertex < vertices; vertex++) {
        const angle = Math.PI * 2 * vertex / vertices;
        const variation = .7 + random(seed + index * 47 + vertex) * .42;
        const px = x + Math.cos(angle) * radius * variation;
        const py = y + Math.sin(angle) * radius * variation;
        if (!vertex)
          context.moveTo(px, py);
        else
          context.lineTo(px, py);
      }
      context.closePath();
      context.fillStyle = colors[Math.floor(random(seed + index * 53) * colors.length)];
      context.fill();
    }
  });
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
  const size = Math.max(18, Math.min(width, height) * .04);

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

function createStroke(material: Material): Stroke {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    material,
    segments: [[]]
  };
}

export function LetterCanvas({ letter, material, strokes, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const maskPixelsRef = useRef<ImageData | null>(null);
  const activePointer = useRef<number | null>(null);
  const lastPointer = useRef<Point | null>(null);
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
    const paths = getLetterPaths(letter, width, height);

    maskContext.clearRect(0, 0, width, height);
    strokeLetterPaths(maskContext, paths, paths.toleranceWidth, '#ffffff');
    maskPixelsRef.current = maskContext.getImageData(0, 0, width, height);

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
    context.moveTo(width / 2, height * .14);
    context.lineTo(width / 2, height * .86);
    context.stroke();
    context.restore();

    drawLetters(context, letter, width, height);

    const paint = document.createElement('canvas');
    paint.width = width;
    paint.height = height;
    const paintContext = paint.getContext('2d');
    if (paintContext) {
      strokes.forEach(stroke => drawStroke(paintContext, stroke, width, height));
      if (draft)
        drawStroke(paintContext, draft, width, height);

      paintContext.globalCompositeOperation = 'destination-in';
      paintContext.drawImage(mask, 0, 0);
      context.drawImage(paint, 0, 0);
    }
  }, [letter, strokes, draft, size]);

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>): Point {
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

    const x = Math.max(0, Math.min(mask.width - 1, Math.round(point.x * mask.width)));
    const y = Math.max(0, Math.min(mask.height - 1, Math.round(point.y * mask.height)));
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
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    const point = pointFromEvent(event);
    lastPointer.current = point;
    setDraft(appendSamples(createStroke(material), [point]));
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId)
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
