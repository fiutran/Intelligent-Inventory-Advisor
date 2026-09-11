import type { ReactNode } from 'react';
import type { InventoryListItem } from '../../core/types.js';
import { PROV_LABEL } from '../constants';

interface InventoryScreenProps {
  owned: InventoryListItem[];
  considering: InventoryListItem[];
  retired: InventoryListItem[];
  onRemove: (itemId: number) => void;
  onWeighConsidering: (name: string) => void;
  onReset: () => void;
}

function ItemRow({
  item,
  action,
}: {
  item: InventoryListItem;
  action?: ReactNode;
}) {
  return (
    <div className="item">
      <div className="t2">{item.icon}</div>
      <div style={{ flex: 1 }}>
        <div className="nm">{item.name}</div>
        <div className="mt">
          {item.meta}
          {item.status === 'owned' ? ` · owned ${item.since}` : ''}
          {item.status === 'retired' ? ' · replaced' : ''}
          {item.status === 'considering' ? ' · saved for later' : ''}{' '}
          {item.status === 'owned' && (
            <span className={`prov ${item.prov}`}>{PROV_LABEL[item.prov]}</span>
          )}
          {item.status === 'considering' && <span className="prov manual">Considering</span>}
          {item.status === 'retired' && <span className="prov photo">Retired</span>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function InventoryScreen({
  owned,
  considering,
  retired,
  onRemove,
  onWeighConsidering,
  onReset,
}: InventoryScreenProps) {
  const empty = owned.length === 0 && considering.length === 0 && retired.length === 0;

  return (
    <section className="screen fade">
      {empty ? (
        <div className="shot" style={{ marginTop: 12 }}>
          <div className="cam">▤</div>
          <div className="h">Nothing here yet</div>
          <div className="s">
            Add what you already own, or weigh a purchase on Decide. Start with a clean slate:
            your list grows as you use the app.
          </div>
        </div>
      ) : null}

      {considering.length > 0 && (
        <>
          <div className="invhead">
            <div className="eyebrow" style={{ margin: 0 }}>
              Thinking about
            </div>
            <div className="n">{considering.length}</div>
          </div>
          <div className="list">
            {considering.map((i) => (
              <ItemRow
                key={`c-${i.item_id}`}
                item={i}
                action={
                  <div className="item-actions">
                    <button type="button" className="mini" onClick={() => onWeighConsidering(i.name)}>
                      Weigh
                    </button>
                    <button type="button" className="mini ghost" onClick={() => onRemove(i.item_id)}>
                      Remove
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}

      <div className="invhead" style={{ marginTop: considering.length ? 18 : 4 }}>
        <div className="eyebrow" style={{ margin: 0 }}>
          Your things
        </div>
        <div className="n">{owned.length} items</div>
      </div>
      <div className="list">
        {owned.map((i) => (
          <ItemRow key={`o-${i.item_id}`} item={i} />
        ))}
      </div>

      {retired.length > 0 && (
        <>
          <div className="invhead" style={{ marginTop: 18 }}>
            <div className="eyebrow" style={{ margin: 0 }}>
              Replaced
            </div>
            <div className="n">{retired.length}</div>
          </div>
          <div className="list">
            {retired.map((i) => (
              <ItemRow key={`r-${i.item_id}`} item={i} />
            ))}
          </div>
        </>
      )}

      {!empty && (
        <button type="button" className="backlink" style={{ marginTop: 20 }} onClick={onReset}>
          Clear all my data (start fresh)
        </button>
      )}
    </section>
  );
}
