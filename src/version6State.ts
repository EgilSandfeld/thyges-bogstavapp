export type Version6TreeType = 'oak' | 'birch' | 'beech' | 'maple';
export type Version6TrunkThickness = 'slim' | 'medium' | 'thick';
export type Version6FruitKind = 'cherry' | 'chestnut' | 'chestnut-burr' | 'beechnut' | 'beech-burr';

export interface Version6TreeSettings {
  treeType: Version6TreeType;
  trunkThickness: Version6TrunkThickness;
}

export interface Version6Decoration {
  id: string;
  kind: Version6FruitKind;
  letter: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  createdAt: number;
}

const TREE_SETTINGS_KEY = 'thyges-version-6-tree-settings';
const DECORATIONS_KEY = 'thyges-version-6-decorations';
export const VERSION6_TREE_EVENT = 'thyges:version-6-tree-settings';

const defaultTreeSettings: Version6TreeSettings = {
  treeType: 'oak',
  trunkThickness: 'medium'
};

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getVersion6TreeSettings(): Version6TreeSettings {
  if (!storageAvailable())
    return defaultTreeSettings;

  try {
    const stored = JSON.parse(window.localStorage.getItem(TREE_SETTINGS_KEY) ?? '{}') as Partial<Version6TreeSettings>;
    const treeType: Version6TreeType = ['oak', 'birch', 'beech', 'maple'].includes(stored.treeType ?? '')
      ? stored.treeType as Version6TreeType
      : defaultTreeSettings.treeType;
    const trunkThickness: Version6TrunkThickness = ['slim', 'medium', 'thick'].includes(stored.trunkThickness ?? '')
      ? stored.trunkThickness as Version6TrunkThickness
      : defaultTreeSettings.trunkThickness;
    return { treeType, trunkThickness };
  } catch {
    return defaultTreeSettings;
  }
}

export function setVersion6TreeSettings(settings: Version6TreeSettings) {
  if (storageAvailable())
    window.localStorage.setItem(TREE_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(VERSION6_TREE_EVENT, { detail: settings }));
}

export function getVersion6Decorations(): Version6Decoration[] {
  if (!storageAvailable())
    return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(DECORATIONS_KEY) ?? '[]');
    return Array.isArray(value) ? value as Version6Decoration[] : [];
  } catch {
    return [];
  }
}

export function saveVersion6Decorations(decorations: Version6Decoration[]) {
  if (storageAvailable())
    window.localStorage.setItem(DECORATIONS_KEY, JSON.stringify(decorations));
}
