import { SUGGESTIONS } from '../constants';

interface DecideScreenProps {
  query: string;
  price: string;
  onQueryChange: (v: string) => void;
  onPriceChange: (v: string) => void;
  onWeigh: () => void;
  onJustLog: () => void;
  onPick: (suggestion: string) => void;
}

export function DecideScreen({
  query,
  price,
  onQueryChange,
  onPriceChange,
  onWeigh,
  onJustLog,
  onPick,
}: DecideScreenProps) {
  return (
    <section className="screen fade">
      <p className="lead">What are you thinking of buying?</p>
      <div>
        <label className="fl" htmlFor="q">
          Item
        </label>
        <input
          className="input"
          id="q"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onWeigh()}
          placeholder="e.g. iPhone 16 Pro"
          autoComplete="off"
        />
      </div>
      <div className="prow">
        <div>
          <label className="fl" htmlFor="p">
            Price
          </label>
          <input
            className="input"
            id="p"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            inputMode="numeric"
            placeholder="optional, €"
          />
        </div>
        <div style={{ paddingBottom: 1 }}>
          <label className="fl">&nbsp;</label>
          <div style={{ fontSize: 12, color: 'var(--faint)', padding: '13px 2px' }}>
            I&apos;ll fill it if I know it
          </div>
        </div>
      </div>
      <div className="chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chip" onClick={() => onPick(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="fork">
        <button type="button" className="btn primary" onClick={onWeigh}>
          <span>Weigh it against my stuff</span>
        </button>
        <button type="button" className="btn ghost" onClick={onJustLog}>
          <span className="ic">＋</span>
          <span>
            Just log that I&apos;m considering it
            <small>Saves the item, skips the advice</small>
          </span>
        </button>
      </div>
      <p className="caption" style={{ textAlign: 'left', margin: '16px 2px 0' }}>
        Try an item you already own (<b>AirPods Pro 2</b>), a pricey upgrade (
        <b>iPhone 16 Pro</b>), or something new to you (<b>iPad Air</b>) — the verdict
        changes.
      </p>
    </section>
  );
}
