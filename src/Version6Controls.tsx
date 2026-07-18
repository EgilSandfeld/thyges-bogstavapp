import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getVersion6Decorations,
  getVersion6TreeSettings,
  saveVersion6Decorations,
  setVersion6TreeSettings
} from './version6State';
import type {
  Version6Decoration,
  Version6FruitKind,
  Version6TreeSettings,
  Version6TreeType,
  Version6TrunkThickness
} from './version6State';

interface LayerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const treeTypes: Array<{ value: Version6TreeType; label: string; icon: string }> = [
  { value: 'oak', label: 'Eg', icon: '🌳' },
  { value: 'birch', label: 'Birk', icon: '🌿' },
  { value: 'beech', label: 'Bøg', icon: '🍃' },
  { value: 'maple', label: 'Ahorn', icon: '🍁' }
];

const thicknesses: Array<{ value: Version6TrunkThickness; label: string; width: number }> = [
  { value: 'slim', label: 'Smal', width: 5 },
  { value: 'medium', label: 'Mellem', width: 9 },
  { value: 'thick', label: 'Tyk', width: 14 }
];

const fruits: Array<{ value: Version6FruitKind; label: string }> = [
  { value: 'cherry', label: 'Kirsebær' },
  { value: 'chestnut', label: 'Kastanje' },
  { value: 'chestnut-burr', label: 'Kastanje i skal' },
  { value: 'beechnut', label: 'Bog' },
  { value: 'beech-burr', label: 'Bog i skal' }
];

function sameRect(a: LayerRect | null, b: LayerRect) {
  return Boolean(a && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);
}

function selectedLetter() {
  const pair = document.querySelector<HTMLElement>('.letter-button.is-selected .letter-pair');
  return pair?.textContent?.trim().slice(0, 1) || 'A';
}

function refreshCanvas() {
  document.querySelector<HTMLButtonElement>('.letter-button.is-selected')?.click();
}

export function Version6Controls() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Version6TreeSettings>(() => getVersion6TreeSettings());
  const [fruit, setFruit] = useState<Version6FruitKind | null>(null);
  const [decorations, setDecorations] = useState<Version6Decoration[]>(() => getVersion6Decorations());
  const [letter, setLetter] = useState('A');
  const [rect, setRect] = useState<LayerRect | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const canvas = document.querySelector<HTMLCanvasElement>('.letter-canvas-preview');
      if (canvas) {
        const bounds = canvas.getBoundingClientRect();
        const nextRect = {
          left: Math.round(bounds.left),
          top: Math.round(bounds.top),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height)
        };
        setRect(current => sameRect(current, nextRect) ? current : nextRect);
      }
      const nextLetter = selectedLetter();
      setLetter(current => current === nextLetter ? current : nextLetter);
    };

    updatePosition();
    const interval = window.setInterval(updatePosition, 350);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, []);

  useEffect(() => {
    if (!fruit)
      return;

    const placeFruit = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLCanvasElement) || !target.classList.contains('letter-canvas-preview'))
        return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const bounds = target.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / Math.max(1, bounds.height)));
      const next: Version6Decoration = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        kind: fruit,
        letter: selectedLetter(),
        x,
        y,
        rotation: (Math.random() - .5) * .42,
        scale: .88 + Math.random() * .28,
        createdAt: Date.now()
      };
      setDecorations(current => {
        const updated = [...current, next];
        saveVersion6Decorations(updated);
        return updated;
      });
    };

    document.addEventListener('pointerdown', placeFruit, true);
    return () => document.removeEventListener('pointerdown', placeFruit, true);
  }, [fruit]);

  function updateSettings(patch: Partial<Version6TreeSettings>) {
    setSettings(current => {
      const next = { ...current, ...patch };
      setVersion6TreeSettings(next);
      window.setTimeout(refreshCanvas, 0);
      return next;
    });
  }

  function undoFruit() {
    setDecorations(current => {
      const index = current.map(item => item.letter).lastIndexOf(letter);
      if (index < 0)
        return current;
      const updated = current.filter((_, itemIndex) => itemIndex !== index);
      saveVersion6Decorations(updated);
      return updated;
    });
  }

  function clearFruit() {
    setDecorations(current => {
      const updated = current.filter(item => item.letter !== letter);
      saveVersion6Decorations(updated);
      return updated;
    });
  }

  const visibleDecorations = useMemo(
    () => decorations.filter(item => item.letter === letter),
    [decorations, letter]
  );

  return (
    <>
      <aside className={`version6-controls ${open ? 'is-open' : ''}`}>
        <button type="button" className="version6-toggle" onClick={() => setOpen(value => !value)}>
          <span aria-hidden="true">🌳</span>
          <span>Trævalg</span>
          <strong>6</strong>
        </button>

        {open && (
          <div className="version6-panel">
            <div className="version6-panel-header">
              <div><h2>Version 6 · Træ</h2><p>Vælg trætype, tykkelse og frugt.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Luk">×</button>
            </div>

            <section>
              <h3>Trætype</h3>
              <div className="version6-grid version6-tree-grid">
                {treeTypes.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={settings.treeType === option.value ? 'is-selected' : ''}
                    onClick={() => updateSettings({ treeType: option.value })}
                  >
                    <span aria-hidden="true">{option.icon}</span><span>{option.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3>Stammetykkelse</h3>
              <div className="version6-grid version6-thickness-grid">
                {thicknesses.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={settings.trunkThickness === option.value ? 'is-selected' : ''}
                    onClick={() => updateSettings({ trunkThickness: option.value })}
                  >
                    <span className="version6-trunk-sample" style={{ width: option.width }} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3>Frugt og nødder</h3>
              <div className="version6-grid version6-fruit-grid">
                {fruits.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={fruit === option.value ? 'is-selected' : ''}
                    onClick={() => setFruit(current => current === option.value ? null : option.value)}
                  >
                    <FruitIcon kind={option.value} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
              <p className="version6-help">
                {fruit ? 'Tryk på tegningen for at sætte flere. Tryk på den valgte frugt igen for at stoppe.' : 'Vælg en frugt eller nød, og tryk derefter på tegningen.'}
              </p>
              <div className="version6-decoration-actions">
                <button type="button" onClick={undoFruit} disabled={!visibleDecorations.length}>↶ Fortryd frugt</button>
                <button type="button" onClick={clearFruit} disabled={!visibleDecorations.length}>🗑 Fjern frugter</button>
              </div>
            </section>
          </div>
        )}
      </aside>

      {fruit && <div className="version6-fruit-mode"><FruitIcon kind={fruit} /> Frugtvalg aktivt</div>}

      {rect && createPortal(
        <div
          className="version6-decoration-layer"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          aria-hidden="true"
        >
          {visibleDecorations.map(item => (
            <span
              key={item.id}
              className="version6-placed-fruit"
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation}rad) scale(${item.scale})`
              }}
            >
              <FruitIcon kind={item.kind} />
            </span>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function FruitIcon({ kind }: { kind: Version6FruitKind }) {
  if (kind === 'cherry') {
    return (
      <svg className="version6-fruit-icon" viewBox="0 0 48 48">
        <path d="M25 21 C25 10 31 7 35 5 M25 21 C19 13 17 10 15 7" fill="none" stroke="#478238" strokeWidth="3" strokeLinecap="round" />
        <circle cx="18" cy="31" r="9" fill="#d92d3a" /><circle cx="32" cy="30" r="9" fill="#ef4650" />
        <circle cx="15" cy="28" r="2.3" fill="#ff9aa0" /><circle cx="29" cy="27" r="2.3" fill="#ffc0c3" />
      </svg>
    );
  }

  if (kind === 'chestnut') {
    return (
      <svg className="version6-fruit-icon" viewBox="0 0 48 48">
        <path d="M24 7 C10 11 7 24 13 35 C18 44 33 44 39 34 C45 23 37 11 24 7Z" fill="#8c4827" stroke="#5d2d1c" strokeWidth="2" />
        <path d="M13 32 C19 36 31 37 39 32 C36 43 18 46 13 32Z" fill="#e5c7a1" />
        <path d="M19 13 C25 10 31 13 34 18" fill="none" stroke="#bd7046" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'chestnut-burr') {
    return (
      <svg className="version6-fruit-icon" viewBox="0 0 48 48">
        <g fill="#6e9f3c" stroke="#467426" strokeWidth="1.5">
          <path d="M24 3 L27 11 L34 6 L34 15 L43 13 L38 21 L46 25 L37 29 L42 38 L33 35 L31 45 L24 38 L17 45 L15 35 L6 38 L11 29 L2 25 L10 21 L5 13 L14 15 L14 6 L21 11Z" />
        </g>
        <path d="M15 23 C19 16 30 15 35 23 C32 34 19 35 15 23Z" fill="#9b4f29" stroke="#63301e" strokeWidth="2" />
        <path d="M18 25 C23 28 29 28 33 24" fill="none" stroke="#e5c7a1" strokeWidth="2" />
      </svg>
    );
  }

  if (kind === 'beechnut') {
    return (
      <svg className="version6-fruit-icon" viewBox="0 0 48 48">
        <path d="M9 35 L19 12 L26 36Z" fill="#a76535" stroke="#673b22" strokeWidth="2" />
        <path d="M22 36 L31 11 L40 35Z" fill="#c07a42" stroke="#673b22" strokeWidth="2" />
        <path d="M19 12 L17 7 M31 11 L32 6" stroke="#5b7c35" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className="version6-fruit-icon" viewBox="0 0 48 48">
      <path d="M24 5 C11 5 5 14 7 27 C9 39 18 44 24 39 C30 44 39 39 41 27 C43 14 37 5 24 5Z" fill="#a98955" stroke="#725a34" strokeWidth="2" />
      <g stroke="#725a34" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 11 L3 6 M14 7 L11 1 M20 6 L19 0 M28 6 L30 0 M35 8 L39 2 M40 13 L46 9 M8 20 L1 18 M40 21 L47 19 M10 31 L4 35 M38 31 L44 36" />
      </g>
      <path d="M24 13 L16 34 L24 30 L32 34Z" fill="#b76d38" stroke="#673b22" strokeWidth="1.8" />
    </svg>
  );
}
