interface DecideOwned {
  name: string;
  icon: string;
}

interface DecideScreenProps {
  query: string;
  onQueryChange: (v: string) => void;
  onWeigh: () => void;
  onJustLog: () => void;
  owned: DecideOwned[];
  busy?: boolean;
}

export function DecideScreen({
  query,
  onQueryChange,
  onWeigh,
  onJustLog,
  owned,
  busy = false,
}: DecideScreenProps) {
  return (
    <section className="screen decide fade">
      <p className="lead decide-lead">What are you thinking of buying?</p>

      <div className="decide-panel">
        <label className="fl" htmlFor="q">
          Item
        </label>
        <input
          className="input decide-input"
          id="q"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onWeigh()}
          placeholder="e.g. iPhone 16 Pro"
          autoComplete="off"
        />

        <div className="decide-against">
          <div className="fl">Compared against</div>
          {owned.length === 0 ? (
            <p className="decide-empty">
              Nothing in inventory yet. Add what you own on the Add tab so the verdict has something
              to check.
            </p>
          ) : (
            <ul className="decide-owned">
              {owned.map((item) => (
                <li key={item.name}>
                  <span className="decide-owned-icon">{item.icon}</span>
                  <span>{item.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="decide-foot">
          <button
            type="button"
            className="btn primary"
            onClick={onWeigh}
            disabled={busy}
            aria-busy={busy}
          >
            <span>{busy ? 'Checking specs…' : 'Weigh it against my stuff'}</span>
          </button>
          <button type="button" className="btn ghost" onClick={onJustLog}>
            <span className="ic">＋</span>
            <span>
              Just log that I&apos;m considering it
              <small>Saves the item, skips the advice</small>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
