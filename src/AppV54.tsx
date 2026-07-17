import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LetterCanvasV54 } from './components/LetterCanvasV54';
import { stickerEmoji } from './components/materials';
import { loadState, saveState } from './db';
import type {
  BrushColor,
  BrushOptions,
  BrushShape,
  BrushSize,
  LeafColor,
  LeafShape,
  Letter,
  Material,
  SavedState,
  Sticker,
  StickerKind,
  Stroke,
  TreeColor,
  TreeOptions,
  TrunkColor,
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

const leafShapeOptions: Array<{ value: LeafShape; label: string }> = [
  { value: 'fan', label: 'Vifte' },
  { value: 'lance', label: 'Langt' },
  { value: 'round', label: 'Rundt' },
  { value: 'slender', label: 'Smalt' },
  { value: 'star', label: 'Stjerne' }
];

const leafColorOptions: Array<{ value: LeafColor; label: string; color: string; legacy: TreeColor }> = [
  { value: 'lime', label: 'Lime', color: '#b5df42', legacy: 'light-green' },
  { value: 'red', label: 'Rød', color: '#e94e59', legacy: 'red' },
  { value: 'green', label: 'Grøn', color: '#62bd36', legacy: 'dark-green' },
  { value: 'olive', label: 'Oliven', color: '#94aa3e', legacy: 'dark-green' },
  { value: 'purple', label: 'Lilla', color: '#9b5bd1', legacy: 'purple' },
  { value: 'pink', label: 'Lyserød', color: '#ec72b4', legacy: 'pink' }
];

const trunkColorOptions: Array<{ value: TrunkColor; label: string; color: string }> = [
  { value: 'brown', label: 'Brun', color: '#915a3b' },
  { value: 'charcoal', label: 'Koksgrå', color: '#383b45' },
  { value: 'tan', label: 'Lysebrun', color: '#ae7a43' },
  { value: 'ochre', label: 'Okker', color: '#bd8318' },
  { value: 'rust', label: 'Rødbrun', color: '#ad482d' }
];

const trunkOptions: Array<{ value: TrunkCount; label: string }> = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' }
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
  return Boolean(
    options.color &&
    options.leafColor &&
    options.trunkColor &&
    options.leafShape &&
    options.trunks
  );
}

export default function AppV54() {
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
    if (availableMaterials.includes(material))
      return;
    setMaterial('water');
    setSelectedSticker(null);
    setOpenConfigurator(null);
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
            <p>Version 5.4 · tegn, byg og pynt</p>
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
                      <ChoiceButton
                        key={option.value}
                        selected={brushOptions.color === option.value}
                        onClick={() => setBrushOptions(current => ({ ...current, color: option.value }))}
                      >
                        <span className="color-dot" style={{ background: option.color }} />
                        <span>{option.label}</span>
                      </ChoiceButton>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Form">
                    {brushShapeOptions.map(option => (
                      <ChoiceButton
                        key={option.value}
                        selected={brushOptions.shape === option.value}
                        onClick={() => setBrushOptions(current => ({ ...current, shape: option.value }))}
                      >
                        <span>{option.icon}</span><span>{option.label}</span>
                      </ChoiceButton>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Størrelse">
                    {brushSizeOptions.map(option => (
                      <ChoiceButton
                        key={option.value}
                        selected={brushOptions.size === option.value}
                        onClick={() => setBrushOptions(current => ({ ...current, size: option.value }))}
                      >
                        <span>{option.icon}</span><span>{option.label}</span>
                      </ChoiceButton>
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
                  <OptionGroup title="Blade">
                    {leafShapeOptions.map(option => (
                      <ChoiceButton
                        key={option.value}
                        selected={treeOptions.leafShape === option.value}
                        onClick={() => setTreeOptions(current => ({ ...current, leafShape: option.value }))}
                      >
                        <LeafIcon shape={option.value} />
                        <span>{option.label}</span>
                      </ChoiceButton>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Bladfarve">
                    {leafColorOptions.map(option => (
                      <ChoiceButton
                        key={option.value}
                        selected={treeOptions.leafColor === option.value}
                        onClick={() => setTreeOptions(current => ({
                          ...current,
                          leafColor: option.value,
                          color: option.legacy
                        }))}
                      >
                        <span className="color-dot" style={{ background: option.color }} />
                        <span>{option.label}</span>
                      </ChoiceButton>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Stammefarve">
                    {trunkColorOptions.map(option => (
                      <ChoiceButton
                        key={option.value}
                        selected={treeOptions.trunkColor === option.value}
                        onClick={() => setTreeOptions(current => ({ ...current, trunkColor: option.value }))}
                      >
                        <span className="color-dot" style={{ background: option.color }} />
                        <span>{option.label}</span>
                      </ChoiceButton>
                    ))}
                  </OptionGroup>
                  <OptionGroup title="Stammer">
                    {trunkOptions.map(option => (
                      <ChoiceButton
                        key={option.value}
                        selected={treeOptions.trunks === option.value}
                        onClick={() => setTreeOptions(current => ({ ...current, trunks: option.value }))}
                      >
                        <strong style={{ fontSize: '1rem' }}>{option.label}</strong>
                      </ChoiceButton>
                    ))}
                  </OptionGroup>
                  <div className={`setup-status ${treeReady ? 'is-ready' : ''}`}>
                    {treeReady
                      ? '✓ Træet er klar'
                      : 'Vælg blade, bladfarve, stammefarve og antal stammer'}
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
            <LetterCanvasV54
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
          <div className="canvas-hint">
            {material === 'brush'
              ? 'Vælg farve, form og størrelse til penslen først'
              : 'Vælg blade, bladfarve, stammefarve og antal stammer først'}
          </div>
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

function ChoiceButton({
  selected,
  onClick,
  children
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`choice-button ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LeafIcon({ shape }: { shape: LeafShape }) {
  const path = shape === 'fan'
    ? 'M3 17 Q8 2 29 5 Q21 22 3 17Z'
    : shape === 'lance'
      ? 'M2 12 Q16 2 31 12 Q16 22 2 12Z'
      : shape === 'slender'
        ? 'M2 12 Q16 7 31 12 Q16 17 2 12Z'
        : shape === 'star'
          ? 'M16 1 L20 8 L29 7 L23 13 L29 20 L20 18 L16 24 L12 18 L3 20 L9 13 L3 7 L12 8Z'
          : 'M3 12 C3 2 29 2 29 12 C29 22 3 22 3 12Z';

  return (
    <svg width="32" height="25" viewBox="0 0 32 25" aria-hidden="true">
      <path d={path} fill="#78b943" stroke="#3d7d32" strokeWidth="1.4" />
      <path d="M4 12 L28 12" stroke="#3d7d32" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
