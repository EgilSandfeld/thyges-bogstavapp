import type {
  BrushColor,
  BrushOptions,
  LeafShape,
  Letter,
  Point,
  Sticker,
  StickerKind,
  Stroke,
  TreeColor,
  TreeOptions
} from '../types';
import { getLetterPaths, strokeLetterPaths } from './glyphs';
import type { LetterPaths } from './glyphs';

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

export function random(seed: number) {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

const brushColors: Record<BrushColor, string> = {
  pink: '#f18bc3',
  purple: '#8e63d7',
  red: '#e54848',
  blue: '#278bd4',
  yellow: '#f5c842',
  green: '#56a94c',
  black: '#2b2b2b'
};

const treeColors: Record<TreeColor, [string, string, string]> = {
  pink: ['#f7b7d8', '#ed77b7', '#ca4c97'],
  purple: ['#c8a8ef', '#9366cf', '#69449f'],
  red: ['#f39a8f', '#dc5d53', '#ad3934'],
  'light-green': ['#b9df79', '#80bd55', '#5a963a'],
  'dark-green': ['#69a45f', '#387a42', '#245932']
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
  const minimum = Math.min(width, height);
  const size = brushSize(options, minimum);
  const color = brushColors[options.color];

  context.save();
  context.lineJoin = options.shape === 'flat' ? 'bevel' : 'round';
  context.lineCap = options.shape === 'flat' ? 'square' : 'round';
  smoothPath(context, points, width, height);
  context.lineWidth = options.shape === 'chalk' ? size * .92 : size;
  context.strokeStyle = options.shape === 'chalk' ? `${color}cc` : color;
  context.stroke();

  if (options.shape === 'flat') {
    smoothPath(context, points, width, height);
    context.lineWidth = size * .38;
    context.strokeStyle = 'rgba(255,255,255,.2)';
    context.stroke();
  }

  if (options.shape === 'chalk') {
    const seed = hash(stroke.id);
    for (let index = 0; index < points.length; index += 2) {
      const point = points[index];
      const px = point.x * width + (random(seed + index * 17) - .5) * size;
      const py = point.y * height + (random(seed + index * 23) - .5) * size;
      context.beginPath();
      context.arc(px, py, Math.max(1, size * (.025 + random(seed + index * 29) * .05)), 0, Math.PI * 2);
      context.fillStyle = index % 3 ? `${color}9a` : 'rgba(255,255,255,.34)';
      context.fill();
    }
  }
  context.restore();
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
    const px = point.x * width + (random(seed + index * 7) - .5) * size * .42;
    const py = point.y * height + (random(seed + index * 11) - .5) * size * .42;
    const radiusX = size * (.13 + random(seed + index * 13) * .13);
    const radiusY = radiusX * (.22 + random(seed + index * 17) * .2);
    context.beginPath();
    context.ellipse(px, py, radiusX, radiusY, (random(seed + index * 19) - .5) * .7, Math.PI * .08, Math.PI * .92);
    context.strokeStyle = 'rgba(225,247,249,.55)';
    context.lineWidth = Math.max(1.2, size * .045);
    context.stroke();
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
    const px = point.x * width + (random(seed + index * 11) - .5) * size * .58;
    const py = point.y * height + (random(seed + index * 17) - .5) * size * .58;
    const radius = size * (.08 + random(seed + index * 23) * .13);
    const vertices = 5 + Math.floor(random(seed + index * 29) * 3);
    context.beginPath();
    for (let vertex = 0; vertex < vertices; vertex++) {
      const angle = Math.PI * 2 * vertex / vertices;
      const variation = .68 + random(seed + index * 31 + vertex) * .48;
      const vx = px + Math.cos(angle) * radius * variation;
      const vy = py + Math.sin(angle) * radius * variation;
      if (!vertex)
        context.moveTo(vx, vy);
      else
        context.lineTo(vx, vy);
    }
    context.closePath();
    context.fillStyle = colors[Math.floor(random(seed + index * 37) * colors.length)];
    context.fill();
  }
}

function drawVolcanoCore(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number, paths: LetterPaths) {
  smoothPath(context, points, width, height);
  const volcano = context.createLinearGradient(0, paths.top, 0, paths.bottom);
  volcano.addColorStop(0, 'rgba(255,218,76,.98)');
  volcano.addColorStop(.1, 'rgba(239,102,28,.98)');
  volcano.addColorStop(.24, 'rgba(177,58,32,.97)');
  volcano.addColorStop(.42, 'rgba(106,75,65,.97)');
  volcano.addColorStop(.68, 'rgba(127,122,114,.97)');
  volcano.addColorStop(1, 'rgba(146,132,111,.97)');
  context.lineWidth = size * 1.04;
  context.strokeStyle = volcano;
  context.stroke();

  const seed = hash(stroke.id);
  points.forEach((point, index) => {
    if (index % 4)
      return;
    const px = point.x * width + (random(seed + index * 13) - .5) * size * .45;
    const py = point.y * height + (random(seed + index * 19) - .5) * size * .45;
    const relative = Math.max(0, Math.min(1, (py - paths.top) / Math.max(1, paths.bottom - paths.top)));
    const radius = size * (.07 + random(seed + index * 29) * .11);
    context.beginPath();
    context.ellipse(px, py, radius * 1.2, radius * .72, random(seed + index * 31) * Math.PI, 0, Math.PI * 2);
    context.fillStyle = relative < .32
      ? (relative < .12 ? 'rgba(255,232,104,.95)' : 'rgba(226,77,25,.9)')
      : (relative < .63 ? 'rgba(111,83,73,.86)' : 'rgba(157,146,128,.88)');
    context.fill();
  });
}

function drawTreeCore(context: CanvasRenderingContext2D, stroke: Stroke, points: Point[], width: number, height: number, size: number) {
  smoothPath(context, points, width, height);
  const wood = context.createLinearGradient(0, 0, width, height);
  wood.addColorStop(0, 'rgba(118,82,48,.92)');
  wood.addColorStop(.5, 'rgba(97,67,40,.96)');
  wood.addColorStop(1, 'rgba(130,89,50,.94)');
  context.lineWidth = size * .82;
  context.strokeStyle = wood;
  context.stroke();

  const options = stroke.tree ?? { color: 'dark-green', leafShape: 'round', trunks: 1 };
  const colors = treeColors[options.color];
  const seed = hash(stroke.id);
  for (let index = 2; index < points.length; index += 5) {
    const point = points[index];
    const px = point.x * width + (random(seed + index * 17) - .5) * size * .4;
    const py = point.y * height + (random(seed + index * 23) - .5) * size * .4;
    context.beginPath();
    context.ellipse(px, py, size * .1, size * .16, random(seed + index * 29) * Math.PI, 0, Math.PI * 2);
    context.fillStyle = colors[index % colors.length];
    context.fill();
  }
}

function drawCoreStroke(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number, paths: LetterPaths) {
  const size = Math.max(18, Math.min(width, height) * .04);
  for (const points of stroke.segments) {
    if (!points.length)
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
    else if (stroke.material === 'volcano')
      drawVolcanoCore(context, stroke, points, width, height, size, paths);
    else
      drawTreeCore(context, stroke, points, width, height, size);
    context.restore();
  }
}

function flatten(stroke: Stroke) {
  return stroke.segments.flatMap(segment => segment);
}

function drawVolcanoEffects(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number, size: number) {
  const points = flatten(stroke);
  if (points.length < 8)
    return;
  const topPoint = points.reduce((best, point) => point.y < best.y ? point : best, points[0]);
  if (topPoint.y > .58)
    return;
  const seed = hash(stroke.id);
  const px = topPoint.x * width;
  const py = topPoint.y * height;

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.ellipse(px, py, size * .58, size * .18, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(112,73,61,.92)';
  context.fill();
  context.beginPath();
  context.ellipse(px, py - size * .03, size * .38, size * .1, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255,159,35,.96)';
  context.fill();

  for (let index = 0; index < 7; index++) {
    const angle = -Math.PI * (.18 + random(seed + index * 17) * .64);
    const distance = size * (1.1 + random(seed + index * 19) * 2.6);
    const endX = px + Math.cos(angle) * distance;
    const endY = py + Math.sin(angle) * distance;
    context.beginPath();
    context.moveTo(px, py - size * .05);
    context.quadraticCurveTo((px + endX) / 2, endY - size * .55, endX, endY);
    context.strokeStyle = index % 2 ? 'rgba(255,94,25,.9)' : 'rgba(255,211,64,.96)';
    context.lineWidth = Math.max(3, size * (.09 + random(seed + index * 23) * .08));
    context.stroke();
    context.beginPath();
    context.arc(endX, endY, size * (.08 + random(seed + index * 29) * .09), 0, Math.PI * 2);
    context.fillStyle = index % 2 ? 'rgba(241,76,22,.92)' : 'rgba(255,204,63,.96)';
    context.fill();
  }

  for (let index = 0; index < 3; index++) {
    const side = index === 1 ? 0 : index ? 1 : -1;
    context.beginPath();
    context.moveTo(px + side * size * .25, py + size * .02);
    context.bezierCurveTo(
      px + side * size * .45,
      py + size * .8,
      px + side * size * .2,
      py + size * 1.2,
      px + side * size * .5,
      py + size * 1.7
    );
    context.strokeStyle = index === 1 ? 'rgba(255,213,70,.9)' : 'rgba(232,76,25,.88)';
    context.lineWidth = size * .11;
    context.stroke();
  }
  context.restore();
}

function drawLeaf(context: CanvasRenderingContext2D, shape: LeafShape, x: number, y: number, size: number, angle: number, color: string) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = color;
  context.beginPath();
  if (shape === 'heart') {
    context.moveTo(0, size * .34);
    context.bezierCurveTo(-size * .62, -size * .05, -size * .5, -size * .58, 0, -size * .2);
    context.bezierCurveTo(size * .5, -size * .58, size * .62, -size * .05, 0, size * .34);
  } else if (shape === 'pointed') {
    context.moveTo(-size * .55, 0);
    context.quadraticCurveTo(0, -size * .42, size * .62, 0);
    context.quadraticCurveTo(0, size * .42, -size * .55, 0);
  } else {
    context.ellipse(0, 0, size * .55, size * .34, 0, 0, Math.PI * 2);
  }
  context.fill();
  context.restore();
}

function drawTreeEffects(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number, size: number) {
  const points = flatten(stroke);
  if (points.length < 5)
    return;

  const options: TreeOptions = stroke.tree ?? { color: 'dark-green', leafShape: 'round', trunks: 1 };
  const colors = treeColors[options.color];
  const seed = hash(stroke.id);
  const basePoint = points.reduce((best, point) => point.y > best.y ? point : best, points[0]);
  const highestPoint = points.reduce((best, point) => point.y < best.y ? point : best, points[0]);
  const baseX = basePoint.x * width;
  const baseY = basePoint.y * height;
  const targetX = highestPoint.x * width;
  const targetY = Math.max(height * .035, Math.min(highestPoint.y * height - size, baseY - height * .27));
  const treeHeight = Math.max(height * .24, baseY - targetY);

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (let trunk = 0; trunk < options.trunks; trunk++) {
    const offset = (trunk - (options.trunks - 1) / 2) * size * .42;
    const lean = (targetX - baseX) * .42 + (random(seed + trunk * 43) - .5) * size * 1.2;
    context.beginPath();
    context.moveTo(baseX + offset, baseY);
    context.bezierCurveTo(
      baseX + offset - lean * .18,
      baseY - treeHeight * .35,
      targetX + offset + lean * .12,
      targetY + treeHeight * .22,
      targetX + offset,
      targetY
    );
    context.strokeStyle = trunk % 2 ? 'rgba(91,58,34,.94)' : 'rgba(116,76,42,.95)';
    context.lineWidth = size * (.19 + options.trunks * .025);
    context.stroke();
  }

  for (let root = 0; root < 7; root++) {
    const direction = root % 2 ? 1 : -1;
    const rootX = baseX + direction * size * (.6 + random(seed + root * 61) * 2.3);
    const rootY = Math.min(height * .98, baseY + size * (.22 + random(seed + root * 67) * .85));
    context.beginPath();
    context.moveTo(baseX, baseY);
    context.quadraticCurveTo((baseX + rootX) / 2, baseY + size * .1, rootX, rootY);
    context.strokeStyle = 'rgba(117,80,45,.78)';
    context.lineWidth = size * .085;
    context.stroke();
  }

  for (let branch = 0; branch < 7; branch++) {
    const level = .14 + branch * .1;
    const bx = targetX + (baseX - targetX) * level;
    const by = targetY + treeHeight * level;
    const direction = branch % 2 ? 1 : -1;
    const branchX = bx + direction * size * (1.4 + random(seed + branch * 71) * 2.4);
    const branchY = by - size * (.45 + random(seed + branch * 73) * 1.2);
    context.beginPath();
    context.moveTo(bx, by);
    context.quadraticCurveTo((bx + branchX) / 2, branchY + size * .2, branchX, branchY);
    context.strokeStyle = 'rgba(101,70,42,.9)';
    context.lineWidth = size * .1;
    context.stroke();
  }

  const leafCount = 34 + options.trunks * 5;
  for (let leaf = 0; leaf < leafCount; leaf++) {
    const angle = random(seed + leaf * 79) * Math.PI * 2;
    const radius = size * (.45 + random(seed + leaf * 83) * 2.8);
    const lx = targetX + Math.cos(angle) * radius;
    const ly = targetY + Math.sin(angle) * radius * .6;
    drawLeaf(
      context,
      options.leafShape,
      lx,
      ly,
      size * (.32 + random(seed + leaf * 89) * .12),
      angle,
      colors[Math.floor(random(seed + leaf * 97) * colors.length)]
    );
  }
  context.restore();
}

function drawEffects(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
  const size = Math.max(18, Math.min(width, height) * .04);
  if (stroke.material === 'volcano')
    drawVolcanoEffects(context, stroke, width, height, size);
  else if (stroke.material === 'tree')
    drawTreeEffects(context, stroke, width, height, size);
}

export const stickerEmoji: Record<StickerKind, string> = {
  fish: '🐟',
  starfish: '⭐',
  coral: '🪸',
  shell: '🐚',
  crystal: '🔷',
  fossil: '🦴',
  pebble: '🪨',
  gem: '💎',
  flame: '🔥',
  smoke: '☁️',
  spark: '✨',
  lava: '🌋',
  flower: '🌼',
  mushroom: '🍄',
  bird: '🐦',
  butterfly: '🦋'
};

export function stickerRadius(width: number, height: number, sticker: Sticker) {
  return Math.min(width, height) * .062 * sticker.scale;
}

function drawSticker(context: CanvasRenderingContext2D, sticker: Sticker, width: number, height: number) {
  const size = stickerRadius(width, height, sticker) * 1.75;
  context.save();
  context.translate(sticker.x * width, sticker.y * height);
  context.rotate(sticker.rotation);
  context.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(54,42,29,.2)';
  context.shadowBlur = size * .12;
  context.fillText(stickerEmoji[sticker.kind], 0, 0);
  context.restore();
}

export function renderCanvas(
  canvas: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  letter: Letter,
  strokes: Stroke[],
  stickers: Sticker[],
  draft: Stroke | null
) {
  const context = canvas.getContext('2d');
  if (!context)
    return;

  const { width, height } = canvas;
  const paths = getLetterPaths(letter, width, height);
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
  context.moveTo(width / 2, height * .1);
  context.lineTo(width / 2, height * .96);
  context.stroke();
  context.restore();

  stickers.forEach(sticker => drawSticker(context, sticker, width, height));

  context.save();
  context.font = `700 ${Math.max(18, height * .028)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.fillStyle = 'rgba(83,72,58,.48)';
  context.fillText('STORT', width * .255, height * .065);
  context.fillText(letter === 'A' ? 'små a’er' : 'lille', width * .745, height * .065);
  context.restore();

  strokeLetterPaths(context, paths, paths.guideWidth * 2.6, 'rgba(255,255,255,.94)');
  strokeLetterPaths(context, paths, paths.guideWidth, 'rgba(76,68,59,.58)');

  const allStrokes = draft ? [...strokes, draft] : strokes;
  const paint = document.createElement('canvas');
  paint.width = width;
  paint.height = height;
  const paintContext = paint.getContext('2d');
  if (paintContext) {
    allStrokes.forEach(stroke => drawCoreStroke(paintContext, stroke, width, height, paths));
    paintContext.globalCompositeOperation = 'destination-in';
    paintContext.drawImage(mask, 0, 0);
    context.drawImage(paint, 0, 0);
  }

  allStrokes.forEach(stroke => drawEffects(context, stroke, width, height));
}
