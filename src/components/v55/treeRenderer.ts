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
import {
  getVersion6TreeSettings
} from '../../version6State';
import type {
  Version6TreeType,
  Version6TrunkThickness
} from '../../version6State';
import { hash, random, smoothPath } from './common';

interface NormalizedTreeOptions {
  color: TreeColor;
  leafColor: LeafColor;
  trunkColor: TrunkColor;
  leafShape: LeafShape;
  trunks: TrunkCount;
  treeType: Version6TreeType;
  trunkThickness: Version6TrunkThickness;
}

interface PixelPoint {
  x: number;
  y: number;
}

const leafPalettes: Record<LeafColor, [string, string, string]> = {
  lime: ['#d7f489', '#b7df47', '#7eae2f'],
  red: ['#f49a91', '#df584e', '#a93631'],
  green: ['#a3df66', '#62b83c', '#347f2c'],
  olive: ['#c7d473', '#93aa46', '#667b30'],
  purple: ['#d0a6ed', '#9a61cc', '#683b95'],
  pink: ['#f5b3d5', '#e877b4', '#bb4789']
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

const thicknessFactors: Record<Version6TrunkThickness, number> = {
  slim: .72,
  medium: 1.08,
  thick: 1.62
};

export function trunkColorHex(color?: TrunkColor) {
  return trunkPalettes[color ?? 'brown'][1];
}

function normalizeTreeOptions(stroke: Stroke): NormalizedTreeOptions {
  const saved = getVersion6TreeSettings();
  const source = (stroke.tree ?? {}) as Partial<TreeOptions> & {
    color?: TreeColor;
    treeType?: Version6TreeType;
    trunkThickness?: Version6TrunkThickness;
  };

  if (stroke.tree) {
    if (!source.treeType)
      source.treeType = saved.treeType;
    if (!source.trunkThickness)
      source.trunkThickness = saved.trunkThickness;
  }

  return {
    color: source.color ?? 'dark-green',
    leafColor: source.leafColor ?? legacyLeafColors[source.color ?? 'dark-green'],
    trunkColor: source.trunkColor ?? 'brown',
    leafShape: source.leafShape ?? 'round',
    trunks: Math.max(1, Math.min(5, source.trunks ?? 1)) as TrunkCount,
    treeType: source.treeType ?? saved.treeType,
    trunkThickness: source.trunkThickness ?? saved.trunkThickness
  };
}

function flatten(stroke: Stroke) {
  return stroke.segments.flatMap(segment => segment);
}

function cubicPoint(p0: PixelPoint, p1: PixelPoint, p2: PixelPoint, p3: PixelPoint, t: number): PixelPoint {
  const inverse = 1 - t;
  return {
    x: inverse ** 3 * p0.x + 3 * inverse ** 2 * t * p1.x + 3 * inverse * t ** 2 * p2.x + t ** 3 * p3.x,
    y: inverse ** 3 * p0.y + 3 * inverse ** 2 * t * p1.y + 3 * inverse * t ** 2 * p2.y + t ** 3 * p3.y
  };
}

function cubicDerivative(p0: PixelPoint, p1: PixelPoint, p2: PixelPoint, p3: PixelPoint, t: number): PixelPoint {
  const inverse = 1 - t;
  return {
    x: 3 * inverse ** 2 * (p1.x - p0.x) + 6 * inverse * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x),
    y: 3 * inverse ** 2 * (p1.y - p0.y) + 6 * inverse * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y)
  };
}

function speciesBark(options: NormalizedTreeOptions): [string, string, string] {
  if (options.treeType === 'birch')
    return ['#f5f1de', '#d9d5c4', '#3f403b'];
  if (options.treeType === 'beech')
    return ['#aaa9a3', '#85847f', '#5f5f5b'];
  if (options.treeType === 'maple')
    return ['#b47750', '#805039', '#503326'];
  return trunkPalettes[options.trunkColor];
}

function drawTaperedTrunk(
  context: CanvasRenderingContext2D,
  p0: PixelPoint,
  p1: PixelPoint,
  p2: PixelPoint,
  p3: PixelPoint,
  baseWidth: number,
  topWidth: number,
  options: NormalizedTreeOptions,
  seed: number
) {
  const left: PixelPoint[] = [];
  const right: PixelPoint[] = [];
  const samples: PixelPoint[] = [];
  const count = 28;

  for (let index = 0; index <= count; index++) {
    const t = index / count;
    const point = cubicPoint(p0, p1, p2, p3, t);
    const derivative = cubicDerivative(p0, p1, p2, p3, t);
    const length = Math.max(.001, Math.hypot(derivative.x, derivative.y));
    const normalX = -derivative.y / length;
    const normalY = derivative.x / length;
    const taper = (1 - t) ** .72;
    const width = topWidth + (baseWidth - topWidth) * taper;
    left.push({ x: point.x + normalX * width * .5, y: point.y + normalY * width * .5 });
    right.push({ x: point.x - normalX * width * .5, y: point.y - normalY * width * .5 });
    samples.push(point);
  }

  const bark = speciesBark(options);
  const gradient = context.createLinearGradient(p0.x - baseWidth, p0.y, p0.x + baseWidth, p0.y);
  gradient.addColorStop(0, bark[2]);
  gradient.addColorStop(.32, bark[1]);
  gradient.addColorStop(.57, bark[0]);
  gradient.addColorStop(1, bark[2]);

  context.beginPath();
  context.moveTo(left[0].x, left[0].y);
  left.slice(1).forEach(point => context.lineTo(point.x, point.y));
  right.reverse().forEach(point => context.lineTo(point.x, point.y));
  context.closePath();
  context.fillStyle = gradient;
  context.fill();

  context.save();
  context.clip();
  if (options.treeType === 'birch') {
    for (let stripe = 2; stripe < samples.length - 2; stripe += 3) {
      const point = samples[stripe];
      const t = stripe / count;
      const width = topWidth + (baseWidth - topWidth) * (1 - t) ** .72;
      const offset = (random(seed + stripe * 17) - .5) * width * .35;
      context.beginPath();
      context.moveTo(point.x - width * (.24 + random(seed + stripe * 19) * .18), point.y + offset);
      context.lineTo(point.x + width * (.12 + random(seed + stripe * 23) * .2), point.y + offset + (random(seed + stripe * 29) - .5) * 3);
      context.strokeStyle = stripe % 2 ? 'rgba(45,45,42,.72)' : 'rgba(89,87,80,.58)';
      context.lineWidth = Math.max(1.5, width * .075);
      context.lineCap = 'round';
      context.stroke();
    }
  } else if (options.treeType === 'beech') {
    context.beginPath();
    context.moveTo(p0.x - baseWidth * .13, p0.y);
    context.bezierCurveTo(p1.x - baseWidth * .09, p1.y, p2.x - topWidth * .1, p2.y, p3.x - topWidth * .08, p3.y);
    context.strokeStyle = 'rgba(255,255,255,.23)';
    context.lineWidth = Math.max(2, baseWidth * .09);
    context.stroke();
  } else {
    for (let crack = 0; crack < 7; crack++) {
      const start = random(seed + crack * 31) * .78;
      const end = Math.min(.96, start + .14 + random(seed + crack * 37) * .22);
      const a = cubicPoint(p0, p1, p2, p3, start);
      const b = cubicPoint(p0, p1, p2, p3, end);
      context.beginPath();
      context.moveTo(a.x + (random(seed + crack * 41) - .5) * baseWidth * .3, a.y);
      context.quadraticCurveTo((a.x + b.x) * .5 + (random(seed + crack * 43) - .5) * 8, (a.y + b.y) * .5, b.x, b.y);
      context.strokeStyle = options.treeType === 'maple' ? 'rgba(64,36,25,.35)' : 'rgba(52,31,21,.43)';
      context.lineWidth = Math.max(1.3, baseWidth * .035);
      context.stroke();
    }
  }
  context.restore();
}

function drawSpeciesLeaf(
  context: CanvasRenderingContext2D,
  options: NormalizedTreeOptions,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
  vein: string
) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.beginPath();

  if (options.treeType === 'maple') {
    const radii = [1, .43, .86, .4, .76, .4, .86, .43, 1, .34];
    radii.forEach((radius, index) => {
      const leafAngle = -Math.PI / 2 + index * Math.PI * 2 / radii.length;
      const px = Math.cos(leafAngle) * size * radius;
      const py = Math.sin(leafAngle) * size * radius;
      if (!index)
        context.moveTo(px, py);
      else
        context.lineTo(px, py);
    });
    context.closePath();
  } else if (options.treeType === 'oak') {
    context.moveTo(-size * .75, 0);
    context.bezierCurveTo(-size * .64, -size * .3, -size * .42, -size * .38, -size * .26, -size * .19);
    context.bezierCurveTo(-size * .12, -size * .52, size * .14, -size * .52, size * .25, -size * .2);
    context.bezierCurveTo(size * .45, -size * .38, size * .69, -size * .24, size * .78, 0);
    context.bezierCurveTo(size * .65, size * .28, size * .43, size * .36, size * .25, size * .19);
    context.bezierCurveTo(size * .1, size * .5, -size * .14, size * .48, -size * .26, size * .18);
    context.bezierCurveTo(-size * .45, size * .38, -size * .67, size * .26, -size * .75, 0);
  } else if (options.treeType === 'birch') {
    context.moveTo(-size * .72, 0);
    context.quadraticCurveTo(0, -size * .42, size * .78, 0);
    context.quadraticCurveTo(0, size * .42, -size * .72, 0);
  } else {
    context.moveTo(-size * .68, 0);
    context.bezierCurveTo(-size * .42, -size * .5, size * .42, -size * .5, size * .68, 0);
    context.bezierCurveTo(size * .42, size * .5, -size * .42, size * .5, -size * .68, 0);
  }

  context.fillStyle = color;
  context.fill();
  context.beginPath();
  context.moveTo(-size * .52, 0);
  context.lineTo(size * .54, 0);
  context.strokeStyle = vein;
  context.lineWidth = Math.max(1, size * .055);
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
  const bark = speciesBark(options);
  const factor = thicknessFactors[options.trunkThickness];
  const seed = hash(stroke.id);

  for (const points of stroke.segments) {
    if (!points.length)
      continue;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    smoothPath(context, points, width, height);
    context.lineWidth = size * .72 * factor;
    context.strokeStyle = bark[1];
    context.stroke();

    smoothPath(context, points, width, height);
    context.lineWidth = size * .14 * factor;
    context.strokeStyle = bark[0];
    context.stroke();

    for (let index = 1; index < points.length; index += 3) {
      const point = points[index];
      const angle = (random(seed + index * 31) - .5) * 1.4;
      const side = index % 2 ? 1 : -1;
      const leafSize = size * (.46 + random(seed + index * 37) * .16);
      drawSpeciesLeaf(
        context,
        options,
        point.x * width + Math.cos(angle + Math.PI / 2) * size * .28 * side,
        point.y * height + Math.sin(angle + Math.PI / 2) * size * .28 * side,
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
  const bark = speciesBark(options);
  const factor = thicknessFactors[options.trunkThickness];
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
  const targetY = Math.max(height * .035, Math.min(highestY * height - size * .8, baseY - height * .25));
  const treeHeight = Math.max(height * .22, baseY - targetY);
  const center = (options.trunks - 1) * .5;
  const crownCenters: PixelPoint[] = [];

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (let root = 0; root < 8; root++) {
    const direction = root % 2 ? 1 : -1;
    const distance = size * factor * (.8 + random(seed + root * 61) * 2.3);
    const rootX = baseX + direction * distance;
    const rootY = Math.min(height * .99, baseY + size * (.18 + random(seed + root * 67) * .54));
    context.beginPath();
    context.moveTo(baseX, baseY - size * .08);
    context.quadraticCurveTo((baseX + rootX) * .5, baseY + size * .08, rootX, rootY);
    context.strokeStyle = bark[2];
    context.lineWidth = size * .13 * factor;
    context.stroke();
  }

  for (let trunk = 0; trunk < options.trunks; trunk++) {
    const fan = trunk - center;
    const spread = fan * size * (1.05 + options.trunks * .12);
    const endX = targetX + spread;
    const endY = targetY + Math.abs(fan) * size * .12;
    const wobble = (random(seed + trunk * 43) - .5) * size * .75;
    const p0 = { x: baseX, y: baseY };
    const p1 = { x: baseX + spread * .06 + wobble, y: baseY - treeHeight * .37 };
    const p2 = { x: endX - spread * .22 - wobble * .22, y: endY + treeHeight * .24 };
    const p3 = { x: endX, y: endY };
    const sharing = Math.max(.7, 1 - (options.trunks - 1) * .075);
    const baseWidth = size * 1.16 * factor * sharing;
    const topWidth = size * .28 * factor * sharing;
    drawTaperedTrunk(context, p0, p1, p2, p3, baseWidth, topWidth, options, seed + trunk * 101);
    crownCenters.push(p3);
  }

  crownCenters.forEach((crown, crownIndex) => {
    const branchCount = options.treeType === 'birch' ? 8 : 7;
    for (let branch = 0; branch < branchCount; branch++) {
      const direction = branch % 2 ? 1 : -1;
      const level = .12 + branch / branchCount * .76;
      const branchStartY = crown.y + treeHeight * level * .28;
      const branchStartX = crown.x + (baseX - crown.x) * level * .16;
      const branchX = branchStartX + direction * size * (1.5 + random(seed + crownIndex * 113 + branch * 71) * 2.5);
      const branchY = branchStartY - size * (.55 + random(seed + crownIndex * 127 + branch * 73) * 1.25);
      context.beginPath();
      context.moveTo(branchStartX, branchStartY);
      context.quadraticCurveTo((branchStartX + branchX) * .5, branchY + size * .28, branchX, branchY);
      context.strokeStyle = bark[1];
      context.lineWidth = size * .14 * factor;
      context.stroke();
    }

    const baseLeafCount = options.treeType === 'birch' ? 68 : options.treeType === 'beech' ? 62 : 58;
    const leafCount = Math.max(18, Math.round(baseLeafCount / options.trunks));
    const crownWidth = options.treeType === 'oak' ? 3.25 : options.treeType === 'maple' ? 3.05 : 2.72;
    const crownHeight = options.treeType === 'birch' ? .82 : .68;

    for (let leaf = 0; leaf < leafCount; leaf++) {
      const key = seed + crownIndex * 211 + leaf * 79;
      const angle = random(key) * Math.PI * 2;
      const radius = size * (.28 + random(key + 7) * crownWidth);
      const x = crown.x + Math.cos(angle) * radius;
      const y = crown.y + Math.sin(angle) * radius * crownHeight;
      const speciesScale = options.treeType === 'birch' ? .54 : options.treeType === 'maple' ? .72 : .67;
      drawSpeciesLeaf(
        context,
        options,
        x,
        y,
        size * (speciesScale + random(key + 13) * .2),
        angle,
        leaves[Math.floor(random(key + 19) * leaves.length)],
        leaves[2]
      );
    }
  });
  context.restore();
}

export function renderTreeStrokesV55(
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
