import type {
  LeafColor,
  LeafShape,
  Point,
  Stroke,
  TreeColor,
  TreeOptions,
  TrunkColor,
  TrunkCount
} from '../../types';
import { hash, random, smoothPath } from './common';

const leafPalettes: Record<LeafColor, [string, string, string]> = {
  lime: ['#d3f37a', '#b5df42', '#86b72d'],
  red: ['#f7898e', '#e94e59', '#bc303d'],
  green: ['#9add5c', '#62bd36', '#388e2d'],
  olive: ['#c2ce68', '#94aa3e', '#6e8330'],
  purple: ['#c995ed', '#9b5bd1', '#7137a5'],
  pink: ['#f5acd2', '#ec72b4', '#c4498d']
};

export const trunkPalettes: Record<TrunkColor, [string, string, string]> = {
  brown: ['#bd8762', '#875034', '#5d3828'],
  charcoal: ['#747984', '#3f424c', '#24262d'],
  tan: ['#d8ab78', '#aa7543', '#744b2c'],
  ochre: ['#e4b948', '#b77a17', '#80500b'],
  rust: ['#dc7651', '#a9442d', '#713024']
};

const legacyLeafColors: Record<TreeColor, LeafColor> = {
  pink: 'pink',
  purple: 'purple',
  red: 'red',
  'light-green': 'lime',
  'dark-green': 'green'
};

interface NormalizedTreeOptions {
  leafColor: LeafColor;
  trunkColor: TrunkColor;
  leafShape: LeafShape;
  trunks: TrunkCount;
}

function normalizeTreeOptions(stroke: Stroke): NormalizedTreeOptions {
  const source = (stroke.tree ?? {}) as Partial<TreeOptions> & { color?: TreeColor };
  const color = source.color ?? 'dark-green';
  return {
    leafColor: source.leafColor ?? legacyLeafColors[color],
    trunkColor: source.trunkColor ?? 'brown',
    leafShape: source.leafShape ?? 'round',
    trunks: Math.max(1, Math.min(5, source.trunks ?? 1)) as TrunkCount
  };
}

function flatten(stroke: Stroke) {
  return stroke.segments.flatMap(segment => segment);
}

function leafPath(context: CanvasRenderingContext2D, shape: LeafShape, size: number) {
  context.beginPath();
  switch (shape) {
    case 'fan':
      context.moveTo(-size * .58, size * .16);
      context.quadraticCurveTo(-size * .28, -size * .48, size * .58, -size * .32);
      context.quadraticCurveTo(size * .23, size * .48, -size * .58, size * .16);
      break;
    case 'lance':
    case 'pointed':
      context.moveTo(-size * .7, 0);
      context.quadraticCurveTo(-size * .05, -size * .38, size * .72, 0);
      context.quadraticCurveTo(-size * .05, size * .38, -size * .7, 0);
      break;
    case 'slender':
      context.moveTo(-size * .76, 0);
      context.quadraticCurveTo(0, -size * .2, size * .78, 0);
      context.quadraticCurveTo(0, size * .2, -size * .76, 0);
      break;
    case 'star': {
      for (let index = 0; index < 10; index++) {
        const angle = -Math.PI / 2 + index * Math.PI / 5;
        const radius = index % 2 ? size * .34 : size * .7;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (!index)
          context.moveTo(x, y);
        else
          context.lineTo(x, y);
      }
      context.closePath();
      break;
    }
    case 'heart':
      context.moveTo(0, size * .4);
      context.bezierCurveTo(-size * .68, -size * .05, -size * .52, -size * .62, 0, -size * .23);
      context.bezierCurveTo(size * .52, -size * .62, size * .68, -size * .05, 0, size * .4);
      break;
    case 'round':
    default:
      context.ellipse(0, 0, size * .63, size * .46, 0, 0, Math.PI * 2);
      break;
  }
}

function drawLeaf(
  context: CanvasRenderingContext2D,
  shape: LeafShape,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
  veinColor: string
) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  leafPath(context, shape, size);
  context.fillStyle = color;
  context.fill();
  context.beginPath();
  context.moveTo(-size * .48, 0);
  context.lineTo(size * .5, 0);
  context.strokeStyle = veinColor;
  context.lineWidth = Math.max(1, size * .075);
  context.stroke();
  context.restore();
}

function drawTaperedCurve(
  context: CanvasRenderingContext2D,
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  startWidth: number,
  endWidth: number,
  dark: string,
  light: string
) {
  const steps = 20;
  let previous = start;
  for (let index = 1; index <= steps; index++) {
    const t = index / steps;
    const mt = 1 - t;
    const point = {
      x: mt * mt * mt * start.x + 3 * mt * mt * t * control1.x + 3 * mt * t * t * control2.x + t * t * t * end.x,
      y: mt * mt * mt * start.y + 3 * mt * mt * t * control1.y + 3 * mt * t * t * control2.y + t * t * t * end.y
    };
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.strokeStyle = index % 3 ? dark : light;
    context.lineWidth = startWidth + (endWidth - startWidth) * t;
    context.stroke();
    previous = point;
  }
}

export function drawTreeCore(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
  size: number
) {
  const options = normalizeTreeOptions(stroke);
  const leaves = leafPalettes[options.leafColor];
  const trunks = trunkPalettes[options.trunkColor];
  const seed = hash(stroke.id);

  for (const points of stroke.segments) {
    if (!points.length)
      continue;

    smoothPath(context, points, width, height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = size * .78;
    context.strokeStyle = trunks[1];
    context.stroke();

    smoothPath(context, points, width, height);
    context.lineWidth = size * .14;
    context.strokeStyle = trunks[0];
    context.stroke();

    for (let index = 1; index < points.length; index += 3) {
      const point = points[index];
      const angle = (random(seed + index * 31) - .5) * 1.3;
      const leafSize = size * (.5 + random(seed + index * 37) * .18);
      drawLeaf(
        context,
        options.leafShape,
        point.x * width + Math.cos(angle + Math.PI / 2) * size * .25 * (index % 2 ? 1 : -1),
        point.y * height + Math.sin(angle + Math.PI / 2) * size * .25 * (index % 2 ? 1 : -1),
        leafSize,
        angle,
        leaves[index % leaves.length],
        leaves[2]
      );
    }
  }
}

export function drawTreeEffects(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number, size: number) {
  const points = flatten(stroke);
  if (points.length < 5)
    return;

  const options = normalizeTreeOptions(stroke);
  const leaves = leafPalettes[options.leafColor];
  const trunks = trunkPalettes[options.trunkColor];
  const seed = hash(stroke.id);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const drawnFromBottom = firstPoint.y > lastPoint.y + .025;
  const basePoint = drawnFromBottom
    ? firstPoint
    : points.reduce((best, point) => point.y > best.y ? point : best, points[0]);
  const highestY = Math.min(...points.map(point => point.y));
  const crownPoints = points.filter(point => point.y <= highestY + .08);
  const averageCrownX = crownPoints.length
    ? crownPoints.reduce((sum, point) => sum + point.x, 0) / crownPoints.length
    : lastPoint.x;
  const baseX = basePoint.x * width;
  const baseY = basePoint.y * height;
  const targetX = averageCrownX * width;
  const targetY = Math.max(height * .035, Math.min(highestY * height - size * .8, baseY - height * .25));
  const treeHeight = Math.max(height * .22, baseY - targetY);
  const splitY = baseY - treeHeight * .2;
  const splitX = baseX + (targetX - baseX) * .12;
  const center = (options.trunks - 1) * .5;
  const crownCenters: Array<Point> = [];

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  const baseWidth = size * (1.08 + options.trunks * .09);
  const splitWidth = size * (.72 + options.trunks * .05);
  context.beginPath();
  context.moveTo(baseX - baseWidth * .65, baseY + size * .1);
  context.quadraticCurveTo(baseX - baseWidth * .5, splitY + size * .35, splitX - splitWidth * .42, splitY);
  context.lineTo(splitX + splitWidth * .42, splitY);
  context.quadraticCurveTo(baseX + baseWidth * .5, splitY + size * .35, baseX + baseWidth * .65, baseY + size * .1);
  context.closePath();
  const trunkGradient = context.createLinearGradient(baseX - baseWidth, baseY, baseX + baseWidth, splitY);
  trunkGradient.addColorStop(0, trunks[2]);
  trunkGradient.addColorStop(.48, trunks[1]);
  trunkGradient.addColorStop(1, trunks[0]);
  context.fillStyle = trunkGradient;
  context.fill();

  for (let trunk = 0; trunk < options.trunks; trunk++) {
    const fan = trunk - center;
    const spread = fan * size * (1.2 + options.trunks * .12);
    const endX = targetX + spread;
    const endY = targetY + Math.abs(fan) * size * .12;
    const wobble = (random(seed + trunk * 43) - .5) * size * .62;
    crownCenters.push({ x: endX, y: endY });

    drawTaperedCurve(
      context,
      { x: splitX, y: splitY },
      { x: splitX + spread * .08 + wobble, y: splitY - treeHeight * .22 },
      { x: endX - spread * .2 - wobble * .25, y: endY + treeHeight * .25 },
      { x: endX, y: endY },
      size * (.62 - options.trunks * .035),
      size * (.28 - options.trunks * .012),
      trunks[1],
      trunks[0]
    );
  }

  for (let root = 0; root < 8; root++) {
    const direction = root % 2 ? 1 : -1;
    const distance = size * (.9 + random(seed + root * 61) * 2.5);
    const rootX = baseX + direction * distance;
    const rootY = Math.min(height * .99, baseY + size * (.18 + random(seed + root * 67) * .72));
    context.beginPath();
    context.moveTo(baseX, baseY);
    context.quadraticCurveTo((baseX + rootX) * .5, baseY + size * .14, rootX, rootY);
    context.strokeStyle = trunks[2];
    context.lineWidth = size * .14;
    context.stroke();
  }

  crownCenters.forEach((crown, crownIndex) => {
    const branches = 6 + Math.ceil(options.trunks * .5);
    for (let branch = 0; branch < branches; branch++) {
      const direction = branch % 2 ? 1 : -1;
      const branchX = crown.x + direction * size * (1.2 + random(seed + crownIndex * 113 + branch * 71) * 2.1);
      const branchY = crown.y + size * (-.7 + random(seed + crownIndex * 127 + branch * 73) * 1.4);
      context.beginPath();
      context.moveTo(crown.x, crown.y + size * .48);
      context.quadraticCurveTo((crown.x + branchX) * .5, branchY + size * .2, branchX, branchY);
      context.strokeStyle = trunks[1];
      context.lineWidth = size * .16;
      context.stroke();
    }

    const leafCount = Math.max(18, Math.round(52 / Math.sqrt(options.trunks)));
    for (let leaf = 0; leaf < leafCount; leaf++) {
      const key = seed + crownIndex * 211 + leaf * 79;
      const angle = random(key) * Math.PI * 2;
      const radius = size * (.28 + random(key + 7) * 2.8);
      drawLeaf(
        context,
        options.leafShape,
        crown.x + Math.cos(angle) * radius,
        crown.y + Math.sin(angle) * radius * .62,
        size * (.5 + random(key + 13) * .2),
        angle,
        leaves[Math.floor(random(key + 19) * leaves.length)],
        leaves[2]
      );
    }
  });
  context.restore();
}
