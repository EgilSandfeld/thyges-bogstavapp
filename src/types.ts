export type Letter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'
  | 'Æ' | 'Ø' | 'Å';

export type Material = 'brush' | 'water' | 'stone' | 'volcano' | 'tree';
export type DrawingMaterial = Material | 'crystal';

export type BrushColor = 'pink' | 'purple' | 'red' | 'blue' | 'yellow' | 'green' | 'black';
export type BrushShape = 'round' | 'flat' | 'chalk';
export type BrushSize = 'small' | 'medium' | 'large';

export type TreeColor = 'pink' | 'purple' | 'red' | 'light-green' | 'dark-green';
export type LeafColor = 'lime' | 'red' | 'green' | 'olive' | 'purple' | 'pink';
export type TrunkColor = 'brown' | 'charcoal' | 'tan' | 'ochre' | 'rust';
export type LeafShape = 'round' | 'pointed' | 'heart' | 'fan' | 'lance' | 'slender' | 'star';
export type TrunkCount = 1 | 2 | 3 | 4 | 5;

export type StoneType = 'pebble' | 'granite' | 'slate' | 'sandstone' | 'lava-rock';
export type CrystalShape = 'cluster' | 'shard' | 'prism' | 'geode' | 'diamond';
export type CrystalColor = 'blue' | 'purple' | 'pink' | 'green' | 'amber' | 'clear';

export interface BrushOptions {
  color: BrushColor;
  shape: BrushShape;
  size: BrushSize;
}

export interface TreeOptions {
  color: TreeColor;
  leafColor?: LeafColor;
  trunkColor?: TrunkColor;
  leafShape: LeafShape;
  trunks: TrunkCount;
}

export interface StoneOptions {
  type: StoneType;
}

export interface CrystalOptions {
  shape: CrystalShape;
  color: CrystalColor;
}

export type StickerKind =
  | 'fish' | 'starfish' | 'coral' | 'shell'
  | 'crystal' | 'fossil' | 'pebble' | 'gem'
  | 'flame' | 'smoke' | 'spark' | 'lava'
  | 'flower' | 'mushroom' | 'bird' | 'butterfly';

export type ExtraStickerKind =
  | 'dolphin' | 'octopus' | 'seahorse' | 'turtle'
  | 'mountain' | 'boulder' | 'meteor' | 'ammonite'
  | 'geode' | 'prism' | 'crystal-cluster' | 'moonstone'
  | 'leaf' | 'acorn' | 'ladybug' | 'bee';

export type StickerKindV55 = StickerKind | ExtraStickerKind;

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  material: DrawingMaterial;
  segments: Point[][];
  brush?: BrushOptions;
  tree?: TreeOptions;
  stone?: StoneOptions;
  crystal?: CrystalOptions;
  createdAt?: number;
}

export interface Sticker {
  id: string;
  kind: StickerKindV55;
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
