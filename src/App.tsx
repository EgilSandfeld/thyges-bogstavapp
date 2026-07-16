import { useEffect, useMemo, useState } from 'react';
import { LetterCanvas } from './components/LetterCanvas';
import { loadState, saveState } from './db';
import type { Letter, Material, SavedState, Stroke } from './types';

const letters: Letter[] = ['A', 'B', 'C'];

const initialState: SavedState = {
  version: 1,
  selectedLetter: 'A',
  strokesByLetter: { A: [], B: [], C: [] }
};

const labels: Record<Material, string> = { water: 'Vand', stone: 'Sten', volcano: 'Vulkan' };

export default function App() {
  const [state, setState] = useState(initialState);
  const [material, setMaterial] = useState<Material>('water');
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    loadState().then(value => {
      if (value?.version === 1)
        setState(value);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded)
      return;

    setSaved(false);
    const timer = window.setTimeout(() => saveState(state).then(() => setSaved(true)), 250);
    return () => window.clearTimeout(timer);
  }, [loaded, state]);

  const materials = useMemo<Material[]>(
    () => state.selectedLetter === 'A' ? ['water', 'stone', 'volcano'] : ['water', 'stone'],
    [state.selectedLetter]
  );

  useEffect(() => {
    if (!materials.includes(material))
      setMaterial('water');
  }, [material, materials]);

  function setStrokes(strokes: Stroke[]) {
    setState(current => ({
      ...current,
      strokesByLetter: { ...current.strokesByLetter, [current.selectedLetter]: strokes }
    }));
  }

  const strokes = state.strokesByLetter[state.selectedLetter];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">Aa</div>
          <div><h1>Thyges Bogstavværksted</h1><p>Tegn lige, hvad du har lyst til</p></div>
        </div>
        <span className={`save-status ${saved ? 'is-saved' : ''}`}>{saved ? '✓ Gemt på tabletten' : '… Gemmer'}</span>
      </header>

      <section className="materials">
        <span className="toolbar-title">Tegn med</span>
        {materials.map(item => (
          <button key={item} className={`material-button material-${item} ${material === item ? 'is-selected' : ''}`} onClick={() => setMaterial(item)}>
            <span className="material-swatch" aria-hidden="true" />
            <span>{labels[item]}</span>
          </button>
        ))}
        <div className="history-actions">
          <button className="tool-button" disabled={!strokes.length} onClick={() => setStrokes(strokes.slice(0, -1))}>↶ Fortryd</button>
          <button className="tool-button danger" disabled={!strokes.length} onClick={() => {
            if (window.confirm(`Er du sikker på, at du vil slette alt på ${state.selectedLetter} og starte forfra?`))
              setStrokes([]);
          }}>🗑️ Slet alt</button>
        </div>
      </section>

      <section className="canvas-panel">
        {loaded ? <LetterCanvas letter={state.selectedLetter} material={material} strokes={strokes} onChange={setStrokes} /> : <div className="loading">Henter din tegning…</div>}
      </section>

      <nav className="letter-picker">
        <span className="toolbar-title">Bogstav</span>
        <div className="letter-buttons">
          {letters.map(letter => (
            <button key={letter} className={`letter-button ${state.selectedLetter === letter ? 'is-selected' : ''}`} onClick={() => setState(current => ({ ...current, selectedLetter: letter }))}>
              <span className="letter-pair">{letter}{letter.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
