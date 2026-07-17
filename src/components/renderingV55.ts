import type { Letter, Sticker, StickerKindV55, Stroke } from '../types';
import { getLetterPaths, strokeLetterPaths } from './glyphs';
import { random } from './v55/common';
import { brushColors, crystalPalettes, drawNonTreeCore, stoneBase } from './v55/materialRenderers';
import { drawTreeCore, drawTreeEffects, trunkPalettes } from './v55/treeRenderer';

export { random };

export const stickerEmojiV55: Record<StickerKindV55, string> = {
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
  butterfly: '🦋',
  dolphin: '🐬',
  octopus: '🐙',
  seahorse: '🐠',
  turtle: '🐢',
  mountain: '⛰️',
  boulder: '🗿',
  meteor: '☄️',
  ammonite: '🐌',
  geode: '🔮',
  prism: '🔺',
  'crystal-cluster': '💠',
  moonstone: '🌙',
  leaf: '🍃',
  acorn: '🌰',
  ladybug: '🐞',
  bee: '🐝'
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
  context.fillText(stickerEmojiV55[sticker.kind], 0, 0);
  context.restore();
}

export function renderCanvasV55(
  canvas: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  letter: Letter,
  strokes: Stroke[],
  stickers: Sticker[]
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

  const paint = document.createElement('canvas');
  paint.width = width;
  paint.height = height;
  const paintContext = paint.getContext('2d');
  const size = Math.max(18, Math.min(width, height) * .04);
  if (paintContext) {
    strokes.forEach(stroke => {
      if (stroke.material === 'tree')
        drawTreeCore(paintContext, stroke, width, height, size);
      else
        drawNonTreeCore(paintContext, stroke, width, height, paths);
    });
    paintContext.globalCompositeOperation = 'destination-in';
    paintContext.drawImage(mask, 0, 0);
    context.drawImage(paint, 0, 0);
  }

  strokes.forEach(stroke => {
    if (stroke.material === 'tree')
      drawTreeEffects(context, stroke, width, height, size);
  });
}

export function previewColor(stroke: Stroke) {
  if (stroke.material === 'brush')
    return brushColors[stroke.brush?.color ?? 'blue'];
  if (stroke.material === 'water')
    return 'rgba(42,148,187,.84)';
  if (stroke.material === 'stone')
    return stoneBase(stroke.stone?.type ?? 'pebble')[1];
  if (stroke.material === 'crystal')
    return crystalPalettes[stroke.crystal?.color ?? 'blue'][1];
  if (stroke.material === 'volcano')
    return 'rgba(226,77,25,.9)';
  return trunkPalettes[stroke.tree?.trunkColor ?? 'brown'][1];
}
