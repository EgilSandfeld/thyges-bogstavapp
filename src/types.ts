export type Letter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'
  | 'Æ' | 'Ø' | 'Å';

export type Material = 'water' | 'stone' | 'volcano' | 'tree';

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
  version: 2;
  selectedLetter: Letter;
  strokesByLetter: Record<Letter, Stroke[]>;
  stickersByLetter: Record<Letter, Sticker[]>;
}
