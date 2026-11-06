import { formatMoney, type CurrencyCode } from '../../core/currency';

export interface ModelChoice {
  name: string;
  meta: string;
  price: number | null;
}

interface ModelPickerProps {
  query: string;
  models: ModelChoice[];
  currency: CurrencyCode;
  busy: boolean;
  onPick: (name: string) => void;
  onClose: () => void;
}

export function ModelPicker({ query, models, currency, busy, onPick, onClose }: ModelPickerProps) {
  return (
    <div className="picker-back" role="presentation" onClick={busy ? undefined : onClose}>
      <div
        className="picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="kicker">Which one</p>
        <h2 className="hero hero-sm" id="picker-title">
          Pick the exact model
        </h2>
        <p className="sub">
          “{query}” covers more than one. Choose the model in front of you, and I’ll weigh that one against what you
          own.
        </p>
        <div className="picker-list">
          {models.map((model) => (
            <button
              key={model.name}
              type="button"
              className="picker-item"
              disabled={busy}
              onClick={() => onPick(model.name)}
            >
              <strong>{model.name}</strong>
              <span>
                {[model.meta, model.price != null ? formatMoney(model.price, currency) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="btn ghost picker-cancel" onClick={onClose} disabled={busy}>
          <span>{busy ? 'Checking…' : 'None of these'}</span>
        </button>
      </div>
    </div>
  );
}
