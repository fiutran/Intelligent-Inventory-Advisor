import { useState } from 'react';
import { currencySymbol, type CurrencyCode } from '../../core/currency';
import { CATEGORY_GROUPS } from '../../data/seed';

const PLACEHOLDER: Record<string, string> = {
  phone: 'iPhone 14 Pro',
  headphones: 'Sony WH-1000XM5',
  laptop: 'MacBook Pro',
  'personal-care': 'Period massager',
  kitchen: 'Air fryer',
};

interface AddScreenProps {
  currency: CurrencyCode;
  onSave: (input: {
    name: string;
    category: string;
    price: number | null;
    summary: string;
  }) => void;
}

export function AddScreen({ currency, onSave }: AddScreenProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('phone');
  const [price, setPrice] = useState('');
  const [summary, setSummary] = useState('');

  const save = () => {
    const n = name.trim();
    if (!n) return;
    const p = parseInt(price.replace(/[^\d]/g, ''), 10);
    onSave({
      name: n,
      category,
      price: Number.isNaN(p) ? null : p,
      summary: summary.trim(),
    });
    setName('');
    setPrice('');
    setSummary('');
  };

  return (
    <section className="screen fade">
      <p className="kicker">So the advisor knows you</p>
      <h2 className="hero hero-sm">What do you already own?</h2>
      <p className="sub">
        Pick the kind of electronics. A period massager stays in personal care, so you won’t buy a second one later.
      </p>

      <div>
        <label className="fl" htmlFor="add-name">
          Name
        </label>
        <input
          className="input"
          id="add-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder={PLACEHOLDER[category] ?? 'What is it called?'}
        />
      </div>

      <div className="field-block">
        <label className="fl" htmlFor="add-cat">
          Category
        </label>
        <select
          className="input"
          id="add-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORY_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="prow">
        <div>
          <label className="fl" htmlFor="add-price">
            What you paid ({currencySymbol(currency)})
          </label>
          <input
            className="input"
            id="add-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="fl" htmlFor="add-meta">
            A detail
          </label>
          <input
            className="input"
            id="add-meta"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="256 GB, black"
          />
        </div>
      </div>

      <button type="button" className="btn primary" onClick={save} disabled={!name.trim()}>
        <span>{name.trim() ? 'Add it to my stuff' : 'Name it first'}</span>
      </button>
    </section>
  );
}
