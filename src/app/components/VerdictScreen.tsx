import { Fragment } from 'react';
import type { DeltaKind, Verdict } from '../../core/types.js';

const PILL: Record<DeltaKind, string> = {
  mean: 'p-mean',
  marg: 'p-marg',
  new: 'p-new',
  same: '',
};

interface VerdictScreenProps {
  verdict: Verdict;
  onSkip: () => void;
  onBuy: () => void;
  onBack: () => void;
}

function isDuplicate(v: Verdict): boolean {
  return (
    v.ownedItem !== null &&
    v.candidate.name === v.ownedItem.name
  );
}

function actionLabels(v: Verdict): { skip: string; buy: string } {
  if (isDuplicate(v)) return { skip: 'Not buying', buy: 'Buy anyway' };
  if (v.comparison && v.comparison.length > 0) {
    return { skip: 'Log “skipped”', buy: 'Buy it' };
  }
  return { skip: 'Not buying', buy: 'Buy it' };
}

export function VerdictScreen({ verdict, onSkip, onBuy, onBack }: VerdictScreenProps) {
  const { skip, buy } = actionLabels(verdict);
  const c = verdict.candidate;
  const shortName = c.name.split(' ').slice(0, 2).join(' ');

  return (
    <section className="screen fade">
      <div className="eyebrow">Delta vs. what you own</div>

      <div className={`verdict ${verdict.kind}`}>
        <div className="tag">{verdict.tag}</div>
        <div className="head">{verdict.head}</div>
        <div className="rz">{verdict.rationale}</div>
        <div className="vmeta">
          {verdict.meta.map((m) => (
            <div key={m.key}>
              <div className="k">{m.key}</div>
              <div className="v">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="candline">
        <div className="t2">{c.icon}</div>
        <div>
          <div className="nm">{c.name}</div>
          <div className="mt">
            {c.meta}
            {c.price ? ` · €${c.price}` : ''}
          </div>
        </div>
      </div>

      {verdict.comparison && verdict.comparison.length > 0 && (
        <>
          <div className="cmp">
            <div className="ch">Spec</div>
            <div className="ch r">You own</div>
            <div className="ch r">{shortName}</div>
            {verdict.comparison.map((r) => (
              <Fragment key={r.k}>
                <div className="cell lbl">{r.k}</div>
                <div className="cell val">{r.own}</div>
                <div className="cell new">
                  {r.cand}
                  {r.label ? (
                    <span className={`delta-pill ${PILL[r.kind]}`}>{r.label}</span>
                  ) : null}
                </div>
              </Fragment>
            ))}
          </div>
          <div className="legend">
            <span>
              <span className="dot" style={{ background: 'var(--jade)' }} /> Meaningful
            </span>
            <span>
              <span className="dot" style={{ background: 'var(--faint)' }} /> Marginal
            </span>
            <span>
              <span className="dot" style={{ background: 'var(--amber)' }} /> New
            </span>
          </div>
        </>
      )}

      {isDuplicate(verdict) && (
        <div className="note">
          Nothing to compare — it&apos;s the same model. If this is a <b>replacement</b>,
          mark the old one retired instead of adding a duplicate.
        </div>
      )}

      {!isDuplicate(verdict) && verdict.comparison === null && verdict.ownedItem && (
        <div className="note">
          Add the model to your inventory or pick a known one, and I&apos;ll compare
          spec-by-spec. <b>Value-at-N=1:</b> even one owned item is enough to warn you.
        </div>
      )}

      <div className="actions">
        <button type="button" className="act skip" onClick={onSkip}>
          {skip}
        </button>
        <button type="button" className="act buy" onClick={onBuy}>
          {buy}
        </button>
      </div>

      <button type="button" className="backlink" onClick={onBack}>
        ← weigh a different item
      </button>
    </section>
  );
}
