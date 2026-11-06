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

function friendlySince(since: string): string {
  const iso = since.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return since;
  const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function ItemRow({ item, action }: { item: InventoryListItem; action?: ReactNode }) {
  const when =
    item.status === 'owned'
      ? `since ${friendlySince(item.since)}`
      : item.status === 'retired'
        ? 'you moved on'
        : 'saved for later';

  return (
    <div className="item">
      <div className="t2" aria-hidden="true">
        {item.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div className="nm">{item.name}</div>
        <div className="mt">
          {item.meta ? `${item.meta} · ` : ''}
          {when}{' '}
          {item.status === 'owned' && <span className={`prov ${item.prov}`}>{PROV_LABEL[item.prov]}</span>}
          {item.status === 'considering' && <span className="prov manual">On your mind</span>}
          {item.status === 'retired' && <span className="prov photo">Replaced</span>}
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
      <p className="kicker">Your list</p>
      <h2 className="hero hero-sm">What you own</h2>
      <p className="sub">This is the stuff every answer is measured against. It stays on this computer.</p>

      {empty ? (
        <div className="shot">
          <div className="h">Your list is empty</div>
          <div className="s">
            Add a phone, a charger, the headphones you already use. Then the next “should I buy it?” has
            something real to push against.
          </div>
        </div>
      ) : null}

      {considering.length > 0 && (
        <>
          <div className="invhead">
            <div className="eyebrow">On your mind</div>
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
                      Check
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

      {(owned.length > 0 || !empty) && (
        <>
          <div className="invhead">
            <div className="eyebrow">You own</div>
            <div className="n">{owned.length}</div>
          </div>
          {owned.length === 0 ? (
            <p className="yours-empty">Nothing saved as yours yet.</p>
          ) : (
            <div className="list">
              {owned.map((i) => (
                <ItemRow key={`o-${i.item_id}`} item={i} />
              ))}
            </div>
          )}
        </>
      )}

      {retired.length > 0 && (
        <>
          <div className="invhead">
            <div className="eyebrow">You’ve moved on</div>
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
        <button type="button" className="backlink" onClick={onReset}>
          Erase everything and start over
        </button>
      )}
    </section>
  );
}
