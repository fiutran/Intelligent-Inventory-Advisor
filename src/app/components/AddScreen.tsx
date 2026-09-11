import { useState } from 'react';

const CATEGORIES = [
  { id: 'phone', label: 'Phone' },
  { id: 'earbuds', label: 'Earbuds' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'charger', label: 'Charger' },
  { id: 'camera', label: 'Camera' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'watch', label: 'Watch' },
  { id: 'tv', label: 'TV' },
  { id: 'speaker', label: 'Speaker' },
] as const;

interface AddScreenProps {
  onSave: (input: {
    name: string;
    category: string;
    price: number | null;
    summary: string;
  }) => void;
}

export function AddScreen({ onSave }: AddScreenProps) {
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
      <div className="eyebrow">Add to inventory</div>
      <p className="lead">What do you already own?</p>
      <div>
        <label className="fl" htmlFor="add-name">
          Item
        </label>
        <input
          className="input"
          id="add-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="e.g. iPhone 14 Pro"
        />
      </div>
      <div className="prow">
        <div>
          <label className="fl" htmlFor="add-cat">
            Category
          </label>
          <select
            className="input"
            id="add-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="fl" htmlFor="add-price">
            Price paid
          </label>
          <input
            className="input"
            id="add-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="optional"
          />
        </div>
      </div>
      <div style={{ marginTop: 13 }}>
        <label className="fl" htmlFor="add-meta">
          Notes
        </label>
        <input
          className="input"
          id="add-meta"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="e.g. 256 GB · black"
        />
      </div>
      <button
        type="button"
        className="btn primary"
        style={{ marginTop: 16 }}
        onClick={save}
        disabled={!name.trim()}
      >
        <span>Save to inventory</span>
      </button>
      <p className="caption" style={{ textAlign: 'left', margin: '14px 2px 0' }}>
        Type what you own so Decide can compare upgrades against it later.
      </p>
    </section>
  );
}
