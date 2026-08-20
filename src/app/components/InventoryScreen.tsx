import type { OwnedItem } from '../../core/types.js';
import { PROV_LABEL } from '../constants';

interface InventoryScreenProps {
  items: OwnedItem[];
}

export function InventoryScreen({ items }: InventoryScreenProps) {
  return (
    <section className="screen fade">
      <div className="invhead">
        <div className="eyebrow" style={{ margin: 0 }}>
          Your things
        </div>
        <div className="n">{items.length} items</div>
      </div>
      <div className="list">
        {items.map((i) => (
          <div key={i.name} className="item">
            <div className="t2">{i.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="nm">{i.name}</div>
              <div className="mt">
                {i.meta} · owned {i.since}{' '}
                <span className={`prov ${i.prov}`}>{PROV_LABEL[i.prov]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
