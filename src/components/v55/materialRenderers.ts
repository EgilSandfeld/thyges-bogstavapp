import type {
  BrushColor,
  BrushOptions,
  CrystalColor,
  CrystalOptions,
  CrystalShape,
  Point,
  StoneOptions,
  StoneType,
  Stroke
} from '../../types';
import type { LetterPaths } from '../glyphs';
import { hash, polygon, random, smoothPath } from './common';

export const brushColors: Record<BrushColor, string> = {
  pink: '#f18bc3',
  purple: '#8e63d7',
  red: '#e54848',
  blue: '#278bd4',
  yellow: '#f5c842',
  green: '#56a94c',
  black: '#2b2b2b'
};

export const crystalPalettes: Record<CrystalColor, [string, string, string, string]> = {
  blue: ['rgba(212,247,255,.94)', 'rgba(76,190,239,.88)', 'rgba(23,107,192,.88)', '#0d6eaf'],
  purple: ['rgba(244,226,255,.94)', 'rgba(181,105,229,.88)', 'rgba(101,48,177,.9)', '#6230a9'],
  pink: ['rgba(255,226,245,.95)', 'rgba(244,119,188,.88)', 'rgba(190,54,133,.9)', '#b93681'],
  green: ['rgba(226,255,237,.94)', 'rgba(93,217,137,.88)', 'rgba(29,139,90,.9)', '#188454'],
  amber: ['rgba(255,246,202,.95)', 'rgba(244,190,65,.9)', 'rgba(194,113,20,.92)', '#b36b13'],
  clear: ['rgba(255,255,255,.97)', 'rgba(214,235,242,.78)', 'rgba(135,177,192,.82)', '#7196a4']
};

function brushSize(options: BrushOptions, minimum: number) {
  if (options.size === 'small')
    return Math.max(10, minimum * .024);
  if (options.size === 'large')
    return Math.max(28, minimum * .072);
  return Math.max(18, minimum * .045);
}

function drawBrush(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number) {
  const options = stroke.brush ?? { color: 'blue', shape: 'round', size: 'medium' };
  const size = brushSize(options, Math.min(width, height));
  const color = brushColors[options.color];

  context.lineJoin = options.shape === 'flat' ? 'bevel' : 'round';
  context.lineCap = options.shape === 'flat' ? 'square' : 'round';
  smoothPath(context, points, width, height);
  context.lineWidth = options.shape === 'chalk' ? size * .92 : size;
  context.strokeStyle = options.shape === 'chalk' ? `${color}cc` : color;
  context.stroke();

  if (options.shape === 'flat') {
    smoothPath(context, points, width, height);
    context.lineWidth = size * .38;
    context.strokeStyle = 'rgba(255,255,255,.22)';
    context.stroke();
  }

  if (options.shape === 'chalk') {
    const seed = hash(stroke.id);
    for (let index = 0; index < points.length; index += 2) {
      const point = points[index];
      context.beginPath();
      context.arc(
        point.x * width + (random(seed + index * 17) - .5) * size,
        point.y * height + (random(seed + index * 23) - .5) * size,
        Math.max(1, size * (.025 + random(seed + index * 29) * .05)),
        0,
        Math.PI * 2
      );
      context.fillStyle = index % 3 ? `${color}9a` : 'rgba(255,255,255,.34)';
      context.fill();
    }
  }
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

  const seed = hash(stroke.id);
  for (let index = 2; index < points.length; index += 5) {
    const point = points[index];
    const radius = size * (.14 + random(seed + index * 13) * .13);
    context.beginPath();
    context.ellipse(
      point.x * width + (random(seed + index * 7) - .5) * size * .42,
      point.y * height + (random(seed + index * 11) - .5) * size * .42,
      radius,
      radius * .3,
      (random(seed + index * 19) - .5) * .7,
      Math.PI * .08,
      Math.PI * .92
    );
    context.strokeStyle = 'rgba(225,247,249,.62)';
    context.lineWidth = Math.max(1.2, size * .05);
    context.stroke();
  }
}

export function stoneBase(type: StoneType) {
  switch (type) {
    case 'granite': return ['#a9a39b', '#77736f', '#4f4d4b'] as const;
    case 'slate': return ['#78818b', '#48515b', '#2d333a'] as const;
    case 'sandstone': return ['#d8b77d', '#b5834f', '#8d5f35'] as const;
    case 'lava-rock': return ['#59534f', '#302d2b', '#1f1d1c'] as const;
    case 'pebble':
    default: return ['#b6afa2', '#837d73', '#5d5953'] as const;
  }
}

function drawStone(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number) {
  const options: StoneOptions = { type: stroke.stone?.type ?? 'pebble' };
  const colors = stoneBase(options.type);
  const seed = hash(stroke.id);

  smoothPath(context, points, width, height);
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(.55, colors[1]);
  gradient.addColorStop(1, colors[2]);
  context.lineWidth = size;
  context.strokeStyle = gradient;
  context.stroke();

  for (let index = 1; index < points.length; index += options.type === 'sandstone' ? 4 : 3) {
    const point = points[index];
    const x = point.x * width + (random(seed + index * 11) - .5) * size * .55;
    const y = point.y * height + (random(seed + index * 17) - .5) * size * .55;
    const radius = size * (.09 + random(seed + index * 23) * .15);

    if (options.type === 'slate')
      polygon(context, x, y, radius * 1.5, 5, seed + index * 31, .38);
    else if (options.type === 'sandstone') {
      context.beginPath();
      context.roundRect(x - radius * 1.4, y - radius * .45, radius * 2.8, radius * .9, radius * .3);
    } else
      polygon(context, x, y, radius, 5 + Math.floor(random(seed + index * 29) * 3), seed + index * 31);

    context.fillStyle = index % 3 === 0 ? colors[0] : index % 2 ? colors[1] : colors[2];
    context.fill();

    if (options.type === 'granite' || options.type === 'lava-rock') {
      context.beginPath();
      context.arc(x, y, Math.max(1, radius * .18), 0, Math.PI * 2);
      context.fillStyle = options.type === 'lava-rock' ? 'rgba(205,88,42,.5)' : 'rgba(240,235,225,.55)';
      context.fill();
    }
  }
}

function crystalPath(context: CanvasRenderingContext2D, shape: CrystalShape, x: number, y: number, size: number, angle: number) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.beginPath();

  if (shape === 'diamond') {
    context.moveTo(0, -size);
    context.lineTo(size * .75, 0);
    context.lineTo(0, size);
    context.lineTo(-size * .75, 0);
  } else if (shape === 'geode') {
    context.arc(0, 0, size, 0, Math.PI * 2);
  } else if (shape === 'prism') {
    context.moveTo(-size * .65, size * .75);
    context.lineTo(-size * .35, -size);
    context.lineTo(size * .35, -size);
    context.lineTo(size * .65, size * .75);
  } else {
    context.moveTo(-size * .5, size * .8);
    context.lineTo(-size * .25, -size * .65);
    context.lineTo(0, -size);
    context.lineTo(size * .3, -size * .58);
    context.lineTo(size * .55, size * .8);
  }
  context.closePath();
  context.restore();
}

function drawCrystal(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number) {
  const options: CrystalOptions = {
    shape: stroke.crystal?.shape ?? 'cluster',
    color: stroke.crystal?.color ?? 'blue'
  };
  const colors = crystalPalettes[options.color];
  const seed = hash(stroke.id);

  smoothPath(context, points, width, height);
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(.48, colors[1]);
  gradient.addColorStop(1, colors[2]);
  context.lineWidth = size * .88;
  context.strokeStyle = gradient;
  context.shadowColor = colors[1];
  context.shadowBlur = size * .22;
  context.stroke();
  context.shadowBlur = 0;

  for (let index = 1; index < points.length; index += 4) {
    const point = points[index];
    const count = options.shape === 'cluster' ? 3 : 1;
    for (let crystal = 0; crystal < count; crystal++) {
      const key = seed + index * 37 + crystal * 101;
      const crystalSize = size * (.16 + random(key) * .12);
      const x = point.x * width + (crystal - (count - 1) * .5) * crystalSize * 1.05;
      const y = point.y * height + (random(key + 7) - .5) * size * .35;
      crystalPath(context, options.shape, x, y, crystalSize, (random(key + 13) - .5) * .45);
      context.fillStyle = crystal % 2 ? colors[1] : colors[0];
      context.strokeStyle = colors[3];
      context.lineWidth = Math.max(1, crystalSize * .08);
      context.fill();
      context.stroke();
      context.beginPath();
      context.moveTo(x - crystalSize * .2, y - crystalSize * .55);
      context.lineTo(x + crystalSize * .1, y - crystalSize * .25);
      context.strokeStyle = 'rgba(255,255,255,.86)';
      context.stroke();
    }
  }
}

function drawVolcano(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number, paths: LetterPaths) {
  smoothPath(context, points, width, height);
  const volcano = context.createLinearGradient(0, paths.top, 0, paths.bottom);
  volcano.addColorStop(0, 'rgba(255,218,76,.98)');
  volcano.addColorStop(.18, 'rgba(239,102,28,.98)');
  volcano.addColorStop(.5, 'rgba(106,75,65,.97)');
  volcano.addColorStop(1, 'rgba(146,132,111,.97)');
  context.lineWidth = size * 1.04;
  context.strokeStyle = volcano;
  context.stroke();

  const seed = hash(stroke.id);
  for (let index = 0; index < points.length; index += 4) {
    const point = points[index];
    context.beginPath();
    context.arc(
      point.x * width + (random(seed + index * 13) - .5) * size * .45,
      point.y * height + (random(seed + index * 19) - .5) * size * .45,
      size * (.07 + random(seed + index * 29) * .11),
      0,
      Math.PI * 2
    );
    context.fillStyle = index % 3 ? 'rgba(102,78,68,.82)' : 'rgba(255,119,29,.92)';
    context.fill();
  }
}

export function drawNonTreeCore(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
  paths: LetterPaths
) {
  const size = Math.max(18, Math.min(width, height) * .04);
  for (const points of stroke.segments) {
    if (!points.length || stroke.material === 'tree')
      continue;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (stroke.material === 'brush')
      drawBrush(context, stroke, points, width, height);
    else if (stroke.material === 'water')
      drawWater(context, stroke, points, width, height, size);
    else if (stroke.material === 'stone')
      drawStone(context, stroke, points, width, height, size);
    else if (stroke.material === 'crystal')
      drawCrystal(context, stroke, points, width, height, size);
    else if (stroke.material === 'volcano')
      drawVolcano(context, stroke, points, width, height, size, paths);
    context.restore();
  }
}
