import type { Point } from '../../types';

export function random(seed: number) {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

export function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function smoothPath(context: CanvasRenderingContext2D, points: Point[], width: number, height: number) {
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

export function polygon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  vertices: number,
  seed: number,
  flattenY = 1
) {
  context.beginPath();
  for (let vertex = 0; vertex < vertices; vertex++) {
    const angle = Math.PI * 2 * vertex / vertices;
    const variation = .72 + random(seed + vertex * 17) * .42;
    const vx = x + Math.cos(angle) * radius * variation;
    const vy = y + Math.sin(angle) * radius * variation * flattenY;
    if (!vertex)
      context.moveTo(vx, vy);
    else
      context.lineTo(vx, vy);
  }
  context.closePath();
}
