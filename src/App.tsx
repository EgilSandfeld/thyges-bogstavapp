import { useEffect, useMemo, useState } from 'react';
import { LetterCanvas } from './components/LetterCanvas';
import { loadState, saveState } from './db';
import type { Letter, Material, SavedState, Sticker, StickerKind, Stroke } from './types';

const letters: Letter[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
  'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Æ', 'Ø', 'Å'
];

const materialLabels: Record<Material, string> = {
  water: 'Vand',
  stone: 'Sten',
  volcano: 'Vulkan',
  tree: 'Træer'
};

const materialIcons: Record<Material, string> = {
  water: '💧',
  stone: '🪨',
  volcano: '🌋',
  tree: '🌳'
};

const stickerDefinitions: Record<Material, Array<{ kind: StickerKind; icon: string; label: string }>> = {
  water: [
    { kind: 'fish', icon: '🐟', label: 'Fisk' },
    { kind: 'starfish', icon: '⭐', label: 'Søstjerne' },
    { kind: 'coral', icon: '🪸', label: 'Koral' },
    { kind: 'shell', icon: '🐚', label: 'Musling' }
  ],
  stone: [
    { kind: 'crystal', icon: '🔷', label: 'Krystal' },
    { kind: 'fossil', icon: '🦴', label: 'Fossil' },
    { kind: 'pebble', icon: '🪨', label: 'Sten' },
    { kind: 'gem', icon: '💎', label: 'Ædelsten' }
  ],
  volcano: [
    { kind: 'flame', icon: '🔥', label: 'Flamme' },
    { kind: 'smoke', icon: '☁️', label: 'Røg' },
    { kind: 'spark', icon: '✨', label: 'Gnister' },
    { kind: 'lava', icon: '🌋', label: 'Lava' }
  ],
  tree: [
    { kind: 'flower', icon: '🌼', label: 'Blomst' },
    { kind: 'mushroom', icon: '🍄', label: 'Svamp' },
    { kind: 'bird', icon: '🐦', label: 'Fugl' },
    { kind: 'butterfly', icon: '🦋', label: 'Sommerfugl' }
  ]
};

function createEmptyMap<T>(): Record<Letter, T[]> {
  return Object.fromEntries(letters.map(letter => [letter, [] as T[]])) as unknown as Record<Letter, T[]>;
}

const initialState: SavedState = {
  version: 2,
  selectedLetter: 'A',
  strokesByLetter: createEmptyMap<Stroke>(),
  stickersByLetter: createEmptyMap<Sticker>()
};

function migrateState(value: unknown): SavedState {
  if (!value || typeof value !== 'object')
    return initialState;

  const source = value as {
    selectedLetter?: unknown;
    strokesByLetter?: Record<string, Stroke[]>;
    stickersByLetter?: Record<string, Sticker[]>;
  };

  const strokesByLetter = createEmptyMap<Stroke>();
  const stickersByLetter = createEmptyMap<Sticker>();

  for (const letter of letters) {
    const strokes = source.strokesByLetter?.[letter];
    if (Array.isArray(strokes))
      strokesByLetter[letter] = strokes;

    const stickers = source.stickersByLetter?.[letter];
    if (Array.isArray(stickers))
      stickersByLetter[letter] = stickers;
  }

  const selectedLetter = typeof source.selectedLetter === 'string' && letters.includes(source.selectedLetter as Letter)
    ? source.selectedLetter as Letter
    : 'A';

  return { version: 2, selectedLetter, strokesByLetter, stickersByLetter };
}

function newestTimestamp(items: Array<{ createdAt?: number }>) {
  return items.length ? items[items.length - 1].createdAt ?? 0 : -1;
}

export default function App() {
  const [state, setState] = useState<SavedState>(initialState);
  const [material, setMaterial] = useState<Material>('water');
  const [selectedSticker, setSelectedSticker] = useState<StickerKind | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);
  const [installEvent, setInstallEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadState().then(existing => {
      setState(migrateState(existing));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded)
      return;

    setSaved(false);
    const timeout = window.setTimeout(() => {
      saveState(state).then(() => setSaved(true));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loaded, state]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const availableMaterials = useMemo<Material[]>(() => {
    const common: Material[] = ['water', 'stone', 'tree'];
    return ['A', 'O', 'W'].includes(state.selectedLetter) ? [...common, 'volcano'] : common;
  }, [state.selectedLetter]);

  useEffect(() => {
    if (!availableMaterials.includes(material)) {
      setMaterial('water');
      setSelectedSticker(null);
    }
  }, [availableMaterials, material]);

  const strokes = state.strokesByLetter[state.selectedLetter];
  const stickers = state.stickersByLetter[state.selectedLetter];
  const canUndo = strokes.length > 0 || stickers.length > 0;

  function updateCurrentStrokes(nextStrokes: Stroke[]) {
    setState(current => ({
      ...current,
      strokesByLetter: {
        ...current.strokesByLetter,
        [current.selectedLetter]: nextStrokes
      }
    }));
  }

  function addSticker(sticker: Sticker) {
    setState(current => ({
      ...current,
      stickersByLetter: {
        ...current.stickersByLetter,
        [current.selectedLetter]: [...current.stickersByLetter[current.selectedLetter], sticker]
      }
    }));
  }

  function selectMaterial(nextMaterial: Material) {
    setMaterial(nextMaterial);
    setSelectedSticker(null);
  }

  function selectLetter(letter: Letter) {
    setState(current => ({ ...current, selectedLetter: letter }));
  }

  function undo() {
    if (!canUndo)
      return;

    const strokeTime = newestTimestamp(strokes);
    const stickerTime = newestTimestamp(stickers);

    setState(current => {
      const currentLetter = current.selectedLetter;
      if (stickerTime > strokeTime) {
        return {
          ...current,
          stickersByLetter: {
            ...current.stickersByLetter,
            [currentLetter]: current.stickersByLetter[currentLetter].slice(0, -1)
          }
        };
      }

      return {
        ...current,
        strokesByLetter: {
          ...current.strokesByLetter,
          [currentLetter]: current.strokesByLetter[currentLetter].slice(0, -1)
        }
      };
    });
  }

  function clearCurrentLetter() {
    if (!canUndo)
      return;

    if (!window.confirm(`Er du sikker på, at du vil slette alt på ${state.selectedLetter} og starte forfra?`))
      return;

    setState(current => ({
      ...current,
      strokesByLetter: { ...current.strokesByLetter, [current.selectedLetter]: [] },
      stickersByLetter: { ...current.stickersByLetter, [current.selectedLetter]: [] }
    }));
  }

  async function installApp() {
    if (!installEvent)
      return;

    const promptEvent = installEvent as Event & { prompt: () => Promise<void> };
    await promptEvent.prompt();
    setInstallEvent(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">Aa</div>
          <div>
            <h1>Thyges Bogstavværksted</h1>
            <p>Tegn, byg og pynt bogstaverne</p>
          </div>
        </div>

        <div className="topbar-actions">
          <span className={`save-status ${saved ? 'is-saved' : ''}`}>
            <span aria-hidden="true">{saved ? '✓' : '…'}</span>
            {saved ? 'Gemt på tabletten' : 'Gemmer'}
          </span>
          {installEvent && <button className="install-button" type="button" onClick={installApp}>Installér app</button>}
        </div>
      </header>

      <section className="tool-area" aria-label="Tegneværktøjer">
        <div className="materials">
          <span className="toolbar-title">Tegn med</span>
          <div className="horizontal-tools">
            {availableMaterials.map(item => (
              <button
                key={item}
                type="button"
                className={`material-button material-${item} ${material === item && !selectedSticker ? 'is-selected' : ''}`}
                aria-pressed={material === item && !selectedSticker}
                onClick={() => selectMaterial(item)}
              >
                <span className="material-icon" aria-hidden="true">{materialIcons[item]}</span>
                <span>{materialLabels[item]}</span>
              </button>
            ))}
          </div>

          <div className="history-actions">
            <button type="button" className="tool-button" onClick={undo} disabled={!canUndo}>↶ Fortryd</button>
            <button type="button" className="tool-button danger" onClick={clearCurrentLetter} disabled={!canUndo}>🗑️ Slet alt</button>
          </div>
        </div>

        <div className="stickers">
          <span className="toolbar-title">Pynt med</span>
          <div className="horizontal-tools sticker-scroll">
            {stickerDefinitions[material].map(sticker => (
              <button
                key={sticker.kind}
                type="button"
                className={`sticker-button ${selectedSticker === sticker.kind ? 'is-selected' : ''}`}
                aria-pressed={selectedSticker === sticker.kind}
                onClick={() => setSelectedSticker(current => current === sticker.kind ? null : sticker.kind)}
              >
                <span aria-hidden="true">{sticker.icon}</span>
                <span>{sticker.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="canvas-panel">
        {!loaded ? (
          <div className="loading">Henter din tegning…</div>
        ) : (
          <div key={state.selectedLetter} className="canvas-morph">
            <LetterCanvas
              letter={state.selectedLetter}
              material={material}
              selectedSticker={selectedSticker}
              strokes={strokes}
              stickers={stickers}
              onStrokesChange={updateCurrentStrokes}
              onStickerAdd={addSticker}
            />
          </div>
        )}
      </section>

      <nav className="letter-picker" aria-label="Vælg bogstav">
        <span className="toolbar-title">Bogstav</span>
        <div className="letter-buttons">
          {letters.map(letter => (
            <button
              key={letter}
              type="button"
              className={`letter-button ${state.selectedLetter === letter ? 'is-selected' : ''}`}
              aria-pressed={state.selectedLetter === letter}
              onClick={() => selectLetter(letter)}
            >
              <span className="letter-pair">{letter}{letter.toLocaleLowerCase('da-DK')}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
