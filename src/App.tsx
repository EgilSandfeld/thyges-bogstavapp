import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LetterCanvas } from './components/LetterCanvas';
import { stickerEmoji } from './components/materials';
import { loadState, saveState } from './db';
import type {
  BrushColor,
  BrushOptions,
  BrushShape,
  BrushSize,
  LeafShape,
  Letter,
  Material,
  SavedState,
  Sticker,
  StickerKind,
  Stroke,
  TreeColor,
  TreeOptions,
  TrunkCount
} from './types';

const letters: Letter[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
  'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Æ', 'Ø', 'Å'
];

const materialLabels: Record<Material, string> = {
  brush: 'Pensel',
  water: 'Vand',
  stone: 'Sten',
  volcano: 'Vulkan',
  tree: 'Træ'
};

const materialIcons: Record<Material, string> = {
  brush: '🖌️',
  water: '💧',
  stone: '🪨',
  volcano: '🌋',
  tree: '🌳'
};

const stickerDefinitions: Array<{ kind: StickerKind; label: string }> = [
  { kind: 'fish', label: 'Fisk' },
  { kind: 'starfish', label: 'Søstjerne' },
  { kind: 'coral', label: 'Koral' },
  { kind: 'shell', label: 'Musling' },
  { kind: 'crystal', label: 'Krystal' },
  { kind: 'fossil', label: 'Fossil' },
  { kind: 'pebble', label: 'Sten' },
  { kind: 'gem', label: 'Ædelsten' },
  { kind: 'flame', label: 'Flamme' },
  { kind: 'smoke', label: 'Røg' },
  { kind: 'spark', label: 'Gnister' },
  { kind: 'lava', label: 'Lava' },
  { kind: 'flower', label: 'Blomst' },
  { kind: 'mushroom', label: 'Svamp' },
  { kind: 'bird', label: 'Fugl' },
  { kind: 'butterfly', label: 'Sommerfugl' }
];

const brushColorOptions: Array<{ value: BrushColor; label: string; color: string }> = [
  { value: 'pink', label: 'Lyserød', color: '#f18bc3' },
  { value: 'purple', label: 'Lilla', color: '#8e63d7' },
  { value: 'red', label: 'Rød', color: '#e54848' },
  { value: 'blue', label: 'Blå', color: '#278bd4' },
  { value: 'yellow', label: 'Gul', color: '#f5c842' },
  { value: 'green', label: 'Grøn', color: '#56a94c' },
  { value: 'black', label: 'Sort', color: '#2b2b2b' }
];

const brushShapeOptions: Array<{ value: BrushShape; label: string; icon: string }> = [
  { value: 'round', label: 'Rund', icon: '●' },
  { value: 'flat', label: 'Flad', icon: '▬' },
  { value: 'chalk', label: 'Kridt', icon: '▧' }
];

const brushSizeOptions: Array<{ value: BrushSize; label: string; icon: string }> = [
  { value: 'small', label: 'Lille', icon: '•' },
  { value: 'medium', label: 'Mellem', icon: '●' },
  { value: 'large', label: 'Stor', icon: '⬤' }
];

const treeColorOptions: Array<{ value: TreeColor; label: string; color: string }> = [
  { value: 'pink', label: 'Lyserød', color: '#ed77b7' },
  { value: 'purple', label: 'Lilla', color: '#9366cf' },
  { value: 'red', label: 'Rød', color: '#dc5d53' },
  { value: 'light-green', label: 'Lysegrøn', color: '#80bd55' },
  { value: 'dark-green', label: 'Mørkegrøn', color: '#387a42' }
];

const leafShapeOptions: Array<{ value: LeafShape; label: string; icon: string }> = [
  { value: 'round', label: 'Runde', icon: '●' },
  { value: 'pointed', label: 'Spidse', icon: '◆' },
  { value: 'heart', label: 'Hjerter', icon: '♥' }
];

const trunkOptions: Array<{ value: TrunkCount; label: string }> = [
  { value: 1, label: '1 stamme' },
  { value: 2, label: '2 stammer' },
  { value: 3, label: '3 stammer' }
];

function createEmptyMap<T>(): Record<Letter, T[]> {
  return Object.fromEntries(letters.map(letter => [letter, [] as T[]])) as unknown as Record<Letter, T[]>;
}

const initialState: SavedState = {
  version: 3,
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

  return { version: 3, selectedLetter, strokesByLetter, stickersByLetter };
}

function newestTimestamp(items: Array<{ createdAt?: number }>) {
  return items.length ? items[items.length - 1].createdAt ?? 0 : -1;
}

function completeBrush(options: Partial<BrushOptions>): options is BrushOptions {
  return Boolean(options.color && options.shape && options.size);
}

function completeTree(options: Partial<TreeOptions>): options is TreeOptions {
  return Boolean(options.color && options.leafShape && options.trunks);
}

export default function App() {
  const [state, setState] = useState<SavedState>(initialState);
  const [material, setMaterial] = useState<Material>('water');
  const [selectedSticker, setSelectedSticker] = useState<StickerKind | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [openConfigurator, setOpenConfigurator] = useState<'brush' | 'tree' | null>(null);
  const [brushOptions, setBrushOptions] = useState<Partial<BrushOptions>>({});
  const [treeOptions, setTreeOptions] = useState<Partial<TreeOptions>>({});
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
    const common: Material[] = ['brush', 'water', 'stone', 'tree'];
    return ['A', 'O', 'W'].includes(state.selectedLetter) ? [...common, 'volcano'] : common;
  }, [state.selectedLetter]);

  useEffect(() => {
    if (!availableMaterials.includes(material)) {
      setMaterial('water');
      setSelectedSticker(null);
      setOpenConfigurator(null);
    }
  }, [availableMaterials, material]);

  const strokes = state.strokesByLetter[state.selectedLetter];
  const stickers = state.stickersByLetter[state.selectedLetter];
  const canUndo = strokes.length > 0 || stickers.length > 0;
  const brushReady = completeBrush(brushOptions);
  const treeReady = completeTree(treeOptions);
  const canDraw = material === 'brush' ? brushReady : material === 'tree' ? treeReady : true;

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
    setStickerPickerOpen(false);
    if (nextMaterial === 'brush' || nextMaterial === 'tree')
      setOpenConfigurator(current => current === nextMaterial ? null : nextMaterial);
    else
      setOpenConfigurator(null);
  }

  function selectLetter(letter: Letter) {
    setState(current => ({ ...current, selectedLetter: letter }));
    setStickerPickerOpen(false);
    setOpenConfigurator(null);
  }

  function selectSticker(kind: StickerKind) {
    setSelectedSticker(kind);
    setStickerPickerOpen(false);
    setOpenConfigurator(null);
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
          <div className="brand-copy">
            <h1>Thyges Bogstavværksted</h1>
            <p>Version 5 · tegn, byg og pynt</p>
          </div>
        </div>

        <div className="header-tools" aria-label="Tegneværktøjer">
          {availableMaterials.map(item => (
            <div key={item} className="header-tool">
              <button
                type="button"
                className={`compact-tool material-${item} ${material === item && !selectedSticker ? 'is-selected' : ''} ${(item === 'brush' && !brushReady) || (item === 'tree' && !treeReady) ? 'needs-setup' : ''}`}
                aria-pressed={material === item && !selectedSticker}
                onClick={() => selectMaterial(item)}
              >
                <span aria-hidden="true">{materialIcons[item]}</span>
                <span className="compact-label">{materialLabels[item]}</span>
              </button>

              {item === 'brush' && openConfigurator === 'brush' && (
                <div className="option-popover brush-popover">
                  <h2>Byg din pensel</h2>
                  <OptionGroup title="Farve">
                    {brushColorOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice-button color-choice ${brushOptions.color === option.value ? 'is-selected' : ''}`}
                        onClick={() => setBrushOptions(current => ({ ...current, color: option.value }))}
                        title={option.label}
                      >
                        <span className="color-dot" style={{ background: option.color }} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Form">
                    {brushShapeOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice-button ${brushOptions.shape === option.value ? 'is-selected' : ''}`}
                        onClick={() => setBrushOptions(current => ({ ...current, shape: option.value }))}
                      >
                        <span>{option.icon}</span><span>{option.label}</span>
                      </button>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Størrelse">
                    {brushSizeOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice-button ${brushOptions.size === option.value ? 'is-selected' : ''}`}
                        onClick={() => setBrushOptions(current => ({ ...current, size: option.value }))}
                      >
                        <span>{option.icon}</span><span>{option.label}</span>
                      </button>
                    ))}
                  </OptionGroup>
                  <div className={`setup-status ${brushReady ? 'is-ready' : ''}`}>
                    {brushReady ? '✓ Penslen er klar' : 'Vælg farve, form og størrelse'}
                  </div>
                </div>
              )}

              {item === 'tree' && openConfigurator === 'tree' && (
                <div className="option-popover tree-popover">
                  <h2>Byg dit træ</h2>
                  <OptionGroup title="Farve">
                    {treeColorOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice-button color-choice ${treeOptions.color === option.value ? 'is-selected' : ''}`}
                        onClick={() => setTreeOptions(current => ({ ...current, color: option.value }))}
                      >
                        <span className="color-dot" style={{ background: option.color }} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Blade">
                    {leafShapeOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice-button ${treeOptions.leafShape === option.value ? 'is-selected' : ''}`}
                        onClick={() => setTreeOptions(current => ({ ...current, leafShape: option.value }))}
                      >
                        <span>{option.icon}</span><span>{option.label}</span>
                      </button>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Stammer">
                    {trunkOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice-button ${treeOptions.trunks === option.value ? 'is-selected' : ''}`}
                        onClick={() => setTreeOptions(current => ({ ...current, trunks: option.value }))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </OptionGroup>
                  <div className={`setup-status ${treeReady ? 'is-ready' : ''}`}>
                    {treeReady ? '✓ Træet er klar' : 'Vælg farve, bladform og stammer'}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            className={`compact-tool ${selectedSticker ? 'is-selected' : ''}`}
            aria-label="Vælg klistermærke"
            onClick={() => {
              setStickerPickerOpen(true);
              setOpenConfigurator(null);
            }}
          >
            <span aria-hidden="true">✨</span>
            <span className="compact-label">Pynt</span>
          </button>
          <button type="button" className="compact-tool" onClick={undo} disabled={!canUndo}>
            <span aria-hidden="true">↶</span><span className="compact-label">Fortryd</span>
          </button>
          <button type="button" className="compact-tool danger" onClick={clearCurrentLetter} disabled={!canUndo}>
            <span aria-hidden="true">🗑️</span><span className="compact-label">Slet</span>
          </button>
        </div>

        <div className="topbar-actions">
          <span className={`save-status ${saved ? 'is-saved' : ''}`}>
            <span aria-hidden="true">{saved ? '✓' : '…'}</span>
            {saved ? 'Gemt' : 'Gemmer'}
          </span>
          {installEvent && <button className="install-button" type="button" onClick={installApp}>Installér</button>}
        </div>
      </header>

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
              brushOptions={brushReady ? brushOptions : undefined}
              treeOptions={treeReady ? treeOptions : undefined}
              canDraw={canDraw}
              onStrokesChange={updateCurrentStrokes}
              onStickerAdd={addSticker}
            />
          </div>
        )}
        {!selectedSticker && !canDraw && (
          <div className="canvas-hint">Vælg alle tre indstillinger til {material === 'brush' ? 'penslen' : 'træet'} først</div>
        )}
        {selectedSticker && (
          <button type="button" className="sticker-mode-banner" onClick={() => setSelectedSticker(null)}>
            {stickerEmoji[selectedSticker]} Klistermærke valgt · tryk her for at stoppe
          </button>
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

      {stickerPickerOpen && (
        <div className="modal-backdrop" role="presentation" onPointerDown={() => setStickerPickerOpen(false)}>
          <section className="sticker-modal" role="dialog" aria-modal="true" aria-label="Alle klistermærker" onPointerDown={event => event.stopPropagation()}>
            <div className="modal-header">
              <div><h2>Alle klistermærker</h2><p>Vælg ét, og sæt det frit på tegningen.</p></div>
              <button type="button" className="close-button" onClick={() => setStickerPickerOpen(false)} aria-label="Luk">×</button>
            </div>
            <div className="sticker-grid">
              {stickerDefinitions.map(sticker => (
                <button key={sticker.kind} type="button" className="sticker-card" onClick={() => selectSticker(sticker.kind)}>
                  <span aria-hidden="true">{stickerEmoji[sticker.kind]}</span>
                  <strong>{sticker.label}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function OptionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="option-group">
      <h3>{title}</h3>
      <div className="choice-list">{children}</div>
    </div>
  );
}
