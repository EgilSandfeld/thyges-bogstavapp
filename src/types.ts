export type Letter = 'A' | 'B' | 'C';
export type Material = 'water' | 'stone' | 'volcano';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  material: Material;
  segments: Point[][];
}

export interface SavedState {
  version: 1;
  selectedLetter: Letter;
  strokesByLetter: Record<Letter, Stroke[]>;
}
