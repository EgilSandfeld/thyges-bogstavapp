import type {
  LeafColor,
  LeafShape,
  Point,
  Stroke,
  TreeColor,
  TreeOptions,
  TrunkColor,
  TrunkCount
} from '../types';

const leafPalettes: Record<LeafColor, [string, string, string]> = {
  lime: ['#d3f37a', '#b5df42', '#86b72d'],
  red: ['#f7898e', '#e94e59', '#bc303d'],
  green: ['#9add5c', '#62bd36', '#388e2d'],
  olive: ['#c2ce68', '#94aa3e', '#6e8330'],
  purple: ['#c995ed', '#9b5bd1', '#7137a5'],
  pink: ['#f5acd2', '#ec72b4', '#c4498d']
};

const trunkPalettes: Record<TrunkColor, [string, string, string]> = {
  brown: ['#b77b55', '#915a3b', '#68402e'],
  charcoal: ['#666a74', '#383b45', '#22242b'],
  tan: ['#d0a16b', '#ae7a43', '#81552f'],
  ochre: ['#e0ae39', '#bd8318', '#8f5e0d'],
  rust: ['#d26d49', '#ad482d', '#7e3224']
};

const legacyLeafColors: Record<TreeColor, LeafColor> = {
  pink: 'pink',
  purple: 'purple',
  red: 'red',
  'light-green': 'lime',
  'dark-green': 'green'
};

export function trunkColorHex(color?: TrunkColor) {
  return trunkPalettes[color ?? 'brown'][1];
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

function normalizeTreeOptions(stroke: Stroke): TreeOptions {
  const source = (stroke.tree ?? {}) as Partial<TreeOptions> & { color?: TreeColor };
  return {
    color: source.color ?? 'dark-green',
    leafColor: source.leafColor ?? legacyLeafColors[source.color ?? 'dark-green'],
    trunkColor: source.trunkColor ?? 'brown',
    leafShape: source.leafShape ?? 'round',
    trunks: Math.max(1, Math.min(5, source.trunks ?? 1)) as TrunkCount
  };
}

function flatten(stroke: Stroke) {
  return stroke.segments.flatMap(segment => segment);
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
      const points = 10;
      for (let index = 0; index < points; index++) {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / points;
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

function drawPaintedCore(
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

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    smoothPath(context, points, width, height);
    context.lineWidth = size * .48;
    context.strokeStyle = trunks[1];
    context.stroke();

    smoothPath(context, points, width, height);
    context.lineWidth = size * .1;
    context.strokeStyle = trunks[0];
    context.stroke();

    for (let index = 1; index < points.length; index += 4) {
      const point = points[index];
      const angle = (random(seed + index * 31) - .5) * 1.3;
      const side = index % 2 ? 1 : -1;
      const leafSize = size * (.34 + random(seed + index * 37) * .12);
      drawLeaf(
        context,
        options.leafShape,
        point.x * width + Math.cos(angle + Math.PI / 2) * size * .22 * side,
        point.y * height + Math.sin(angle + Math.PI / 2) * size * .22 * side,
        leafSize,
        angle,
        leaves[index % leaves.length],
        leaves[2]
      );
    }
    context.restore();
  }
}

function drawTreeEffects(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
  size: number
) {
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
  const targetPoint = crownPoints.length
    ? crownPoints.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 })
    : lastPoint;
  const targetX = (crownPoints.length ? targetPoint.x / crownPoints.length : lastPoint.x) * width;
  const baseX = basePoint.x * width;
  const baseY = basePoint.y * height;
  const targetY = Math.max(height * .035, Math.min(highestY * height - size * .7, baseY - height * .25));
  const treeHeight = Math.max(height * .22, baseY - targetY);
  const center = (options.trunks - 1) * .5;
  const crownCenters: Array<{ x: number; y: number }> = [];

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  // Every trunk shares this exact start point. When the stroke starts at the bottom,
  // the first painted point becomes the common root point.
  for (let trunk = 0; trunk < options.trunks; trunk++) {
    const fan = trunk - center;
    const spread = fan * size * (1.05 + options.trunks * .08);
    const endX = targetX + spread;
    const endY = targetY + Math.abs(fan) * size * .1;
    const wobble = (random(seed + trunk * 43) - .5) * size * .65;
    crownCenters.push({ x: endX, y: endY });

    context.beginPath();
    context.moveTo(baseX, baseY);
    context.bezierCurveTo(
      baseX + spread * .08 + wobble,
      baseY - treeHeight * .34,
      endX - spread * .2 - wobble * .25,
      endY + treeHeight * .25,
      endX,
      endY
    );
    context.strokeStyle = trunks[trunk % trunks.length];
    context.lineWidth = size * Math.max(.13, .24 - options.trunks * .018);
    context.stroke();
  }

  for (let root = 0; root < 7; root++) {
    const angle = Math.PI * (.1 + root / 8 * .8);
    const direction = root % 2 ? 1 : -1;
    const distance = size * (.7 + random(seed + root * 61) * 2.1);
    const rootX = baseX + Math.cos(angle) * distance * direction;
    const rootY = Math.min(height * .99, baseY + Math.sin(angle) * distance * .45);
    context.beginPath();
    context.moveTo(baseX, baseY);
    context.quadraticCurveTo((baseX + rootX) * .5, baseY + size * .12, rootX, rootY);
    context.strokeStyle = trunks[2];
    context.lineWidth = size * .08;
    context.stroke();
  }

  crownCenters.forEach((crown, crownIndex) => {
    const branches = 4 + Math.ceil(options.trunks * .5);
    for (let branch = 0; branch < branches; branch++) {
      const direction = branch % 2 ? 1 : -1;
      const branchX = crown.x + direction * size * (1.1 + random(seed + crownIndex * 113 + branch * 71) * 1.8);
      const branchY = crown.y + size * (-.6 + random(seed + crownIndex * 127 + branch * 73) * 1.2);
      context.beginPath();
      context.moveTo(crown.x, crown.y + size * .55);
      context.quadraticCurveTo((crown.x + branchX) * .5, branchY + size * .25, branchX, branchY);
      context.strokeStyle = trunks[1];
      context.lineWidth = size * .075;
      context.stroke();
    }

    const leafCount = Math.max(12, Math.round(32 / options.trunks));
    for (let leaf = 0; leaf < leafCount; leaf++) {
      const key = seed + crownIndex * 211 + leaf * 79;
      const angle = random(key) * Math.PI * 2;
      const radius = size * (.35 + random(key + 7) * 2.5);
      const x = crown.x + Math.cos(angle) * radius;
      const y = crown.y + Math.sin(angle) * radius * .58;
      drawLeaf(
        context,
        options.leafShape,
        x,
        y,
        size * (.28 + random(key + 13) * .13),
        angle,
        leaves[Math.floor(random(key + 19) * leaves.length)],
        leaves[2]
      );
    }
  });
  context.restore();
}

export function renderTreeStrokes(
  canvas: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  strokes: Stroke[]
) {
  const treeStrokes = strokes.filter(stroke => stroke.material === 'tree');
  if (!treeStrokes.length)
    return;

  const context = canvas.getContext('2d');
  if (!context)
    return;

  const { width, height } = canvas;
  const size = Math.max(18, Math.min(width, height) * .04);
  const core = document.createElement('canvas');
  core.width = width;
  core.height = height;
  const coreContext = core.getContext('2d');

  if (coreContext) {
    treeStrokes.forEach(stroke => drawPaintedCore(coreContext, stroke, width, height, size));
    coreContext.globalCompositeOperation = 'destination-in';
    coreContext.drawImage(mask, 0, 0);
    context.drawImage(core, 0, 0);
  }

  treeStrokes.forEach(stroke => drawTreeEffects(context, stroke, width, height, size));
}
