import { Fragment } from 'react';
import { formatMoney, type CurrencyCode } from '../../core/currency';
import type { DeltaKind, Verdict, VerdictKind } from '../../core/types.js';

const PILL: Record<DeltaKind, string> = {
  mean: 'p-mean',
  marg: 'p-marg',
  new: 'p-new',
  same: '',
};

const PILL_TEXT: Record<DeltaKind, string> = {
  mean: 'Better',
  marg: 'Small change',
  new: 'New',
  same: '',
};

const OUTCOME: Record<VerdictKind, string> = {
  skip: 'Skip it',
  wait: 'Hold on',
  buy: 'Go for it',
  clear: 'New for you',
};

interface VerdictScreenProps {
  currency: CurrencyCode;
  verdict: Verdict;
  onSkip: () => void;
  onBuy: () => void;
  onBack: () => void;
}

function isDuplicate(v: Verdict): boolean {
  return v.ownedItem !== null && v.candidate.name === v.ownedItem.name;
}

function actionLabels(v: Verdict): { skip: string; buy: string } {
  if (isDuplicate(v)) return { skip: 'I’ll pass', buy: 'Buy a second one' };
  return { skip: 'I’ll pass', buy: 'I’m buying it' };
}

export function VerdictScreen({ currency, verdict, onSkip, onBuy, onBack }: VerdictScreenProps) {
  const { skip, buy } = actionLabels(verdict);
  const c = verdict.candidate;
  const shortName = c.name.split(' ').slice(0, 2).join(' ');

  return (
    <section className="screen fade">
      <p className="kicker">Your answer</p>

      <div className={`verdict ${verdict.kind}`}>
        <div className="tag">{OUTCOME[verdict.kind]}</div>
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
        <div className="t2" aria-hidden="true">
          {c.icon}
        </div>
        <div>
          <div className="nm">{c.name}</div>
          <div className="mt">
            {c.meta}
            {c.price ? ` · ${formatMoney(c.price, currency)}` : ''}
          </div>
        </div>
      </div>

      {verdict.comparison && verdict.comparison.length > 0 && (
        <>
          <p className="cmp-lead">Side by side with what you own</p>
          <div className="cmp">
            <div className="ch">Spec</div>
            <div className="ch r">You have</div>
            <div className="ch r">{shortName}</div>
            {verdict.comparison.map((r) => (
              <Fragment key={r.k}>
                <div className={`cell lbl ${r.kind}`}>{r.k}</div>
                <div className={`cell val ${r.kind}`}>{r.own}</div>
                <div className={`cell new ${r.kind}`}>
                  {r.cand}
                  {PILL_TEXT[r.kind] ? (
                    <span className={`delta-pill ${PILL[r.kind]}`}>{PILL_TEXT[r.kind]}</span>
                  ) : null}
                </div>
              </Fragment>
            ))}
          </div>
          <div className="legend">
            <span>
              <span className="dot" style={{ background: 'var(--jade)' }} /> Better
            </span>
            <span>
              <span className="dot" style={{ background: 'var(--faint)' }} /> Small change
            </span>
            <span>
              <span className="dot" style={{ background: 'var(--amber)' }} /> New
            </span>
          </div>
        </>
      )}

      {isDuplicate(verdict) && (
        <div className="note">
          Same model, so there’s nothing new to compare. If the old one is worn out, retire it instead of
          keeping two.
        </div>
      )}

      {!isDuplicate(verdict) &&
        verdict.comparison &&
        verdict.ownedItem &&
        (verdict.kind === 'skip' || verdict.kind === 'wait') && (
          <div className="note">
            If you buy it anyway, I’ll swap out <b>{verdict.ownedItem.name}</b>. Worth selling the old one so
            you’re not paying for both.
          </div>
        )}

      {!isDuplicate(verdict) && verdict.comparison === null && verdict.ownedItem && (
        <div className="note">
          I can see you already own something in this category. Add the exact model and I’ll compare them
          spec by spec.
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
        Check something else
      </button>
    </section>
  );
}
