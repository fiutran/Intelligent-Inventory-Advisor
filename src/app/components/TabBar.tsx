import type { TabId } from '../constants';

interface TabBarProps {
  active: TabId | null;
  onSelect: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'decide', label: 'Check' },
  { id: 'inv', label: 'My stuff' },
  { id: 'add', label: 'Add' },
];

function Icon({ id }: { id: TabId }) {
  if (id === 'decide') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
    );
  }
  if (id === 'inv') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TabBar({ active, onSelect }: TabBarProps) {
  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab${active === t.id ? ' on' : ''}`}
          onClick={() => onSelect(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <span className="g">
            <Icon id={t.id} />
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
