export type Letter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'
  | 'Æ' | 'Ø' | 'Å';

export type Material = 'brush' | 'water' | 'stone' | 'volcano' | 'tree';
export type BrushColor = 'pink' | 'purple' | 'red' | 'blue' | 'yellow' | 'green' | 'black';
export type BrushShape = 'round' | 'flat' | 'chalk';
export type BrushSize = 'small' | 'medium' | 'large';

// Kept for backwards compatibility with tree strokes saved before version 5.4.
export type TreeColor = 'pink' | 'purple' | 'red' | 'light-green' | 'dark-green';
export type LeafColor = 'lime' | 'red' | 'green' | 'olive' | 'purple' | 'pink';
export type TrunkColor = 'brown' | 'charcoal' | 'tan' | 'ochre' | 'rust';
export type LeafShape = 'round' | 'pointed' | 'heart' | 'fan' | 'lance' | 'slender' | 'star';
export type TrunkCount = 1 | 2 | 3 | 4 | 5;

export interface BrushOptions {
  color: BrushColor;
  shape: BrushShape;
  size: BrushSize;
}

export interface TreeOptions {
  // Legacy field used by the old renderer. New tree strokes still set it.
  color: TreeColor;
  leafColor: LeafColor;
  trunkColor: TrunkColor;
  leafShape: LeafShape;
  trunks: TrunkCount;
}

export type StickerKind =
  | 'fish' | 'starfish' | 'coral' | 'shell'
  | 'crystal' | 'fossil' | 'pebble' | 'gem'
  | 'flame' | 'smoke' | 'spark' | 'lava'
  | 'flower' | 'mushroom' | 'bird' | 'butterfly';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  material: Material;
  segments: Point[][];
  brush?: BrushOptions;
  tree?: TreeOptions;
  createdAt?: number;
}

export interface Sticker {
  id: string;
  kind: StickerKind;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  createdAt: number;
}

export interface SavedState {
  version: 3;
  selectedLetter: Letter;
  strokesByLetter: Record<Letter, Stroke[]>;
  stickersByLetter: Record<Letter, Sticker[]>;
}
