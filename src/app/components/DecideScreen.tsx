const IDEAS = ['iPhone 16 Pro', 'Pixel 9', 'AirPods Pro (2nd gen)', 'iPad Air'];

interface DecideOwned {
  name: string;
  icon: string;
}

interface DecideScreenProps {
  query: string;
  busy: boolean;
  busyLabel?: string;
  onQueryChange: (v: string) => void;
  onWeigh: () => void;
  onTry: (name: string) => void;
  onJustLog: () => void;
  owned: DecideOwned[];
}

export function DecideScreen({
  query,
  busy,
  busyLabel = 'Checking…',
  onQueryChange,
  onWeigh,
  onTry,
  onJustLog,
  owned,
}: DecideScreenProps) {
  const preview = owned.slice(0, 4);
  const extra = owned.length - preview.length;

  return (
    <section className="screen decide fade">
      <p className="kicker">Before you spend</p>
      <h2 className="hero">Should you buy it?</h2>
      <p className="sub">
        Name the thing you want. I’ll set it next to what you already own and tell you straight.
      </p>

      <label className="sr" htmlFor="q">
        What are you thinking of buying?
      </label>
      <input
        className="input decide-input"
        id="q"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onWeigh()}
        placeholder="iPhone 16 Pro, or anything else"
        autoComplete="off"
        disabled={busy}
      />

      <div className="ideas">
        <span className="ideas-label">Or try one</span>
        <div className="idea-row">
          {IDEAS.map((name) => (
            <button key={name} type="button" className="idea" disabled={busy} onClick={() => onTry(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="yours">
        <div className="yours-label">What you already have</div>
        {owned.length === 0 ? (
          <p className="yours-empty">
            Nothing yet. Add a few things you own and the next answer gets personal. You can still try a name now.
          </p>
        ) : (
          <ul className="yours-list">
            {preview.map((item) => (
              <li key={item.name}>
                <span aria-hidden="true">{item.icon}</span>
                {item.name}
              </li>
            ))}
            {extra > 0 ? <li className="more">+{extra} more</li> : null}
          </ul>
        )}
      </div>

      <div className="decide-foot">
        <button type="button" className="btn primary" onClick={onWeigh} disabled={busy || !query.trim()}>
          <span>{busy ? busyLabel : 'Check it'}</span>
        </button>
        <button type="button" className="btn ghost" onClick={onJustLog} disabled={busy}>
          <span>
            Save for later
            <small>Keep it on your list. No advice yet.</small>
          </span>
        </button>
      </div>
    </section>
  );
}
