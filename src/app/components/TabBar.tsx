import type { TabId } from '../constants';

interface TabBarProps {
  active: TabId | null;
  onSelect: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; glyph: string }[] = [
  { id: 'decide', label: 'Decide', glyph: 'Δ' },
  { id: 'inv', label: 'Inventory', glyph: '▤' },
  { id: 'add', label: 'Add', glyph: '＋' },
];

export function TabBar({ active, onSelect }: TabBarProps) {
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab${active === t.id ? ' on' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          <span className="g">{t.glyph}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
