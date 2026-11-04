import { Fragment } from 'react';
import type { DeltaKind, Verdict } from '../../core/types.js';
import { sameProduct } from '../../core/match.js';

const PILL: Record<DeltaKind, string> = {
  better: 'p-better',
  worse: 'p-worse',
  similar: 'p-similar',
  same: '',
  different: 'p-different',
  unknown: 'p-unknown',
};

interface VerdictScreenProps {
  verdict: Verdict;
  /** Known products the query may have meant (only when it wasn't an exact match). */
  suggestions: string[];
  onPickSuggestion: (name: string) => void;
  onSkip: () => void;
  onBuy: () => void;
  onBack: () => void;
}

function isDuplicate(v: Verdict): boolean {
  return v.ownedItem !== null && sameProduct(v.candidate.name, v.ownedItem.name);
}

function actionLabels(v: Verdict): { skip: string; buy: string } {
  if (isDuplicate(v)) return { skip: 'Not buying', buy: 'Buy anyway' };
  if (v.kind === 'skip') return { skip: 'Skip it', buy: 'Buy anyway' };
  return { skip: 'Not buying', buy: 'Buy it' };
}

/** "iPhone 16 Pro" → "16 Pro": short enough for a table column. */
function shortName(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return words.length > 2 ? words.slice(-2).join(' ') : words.join(' ');
}

export function VerdictScreen({
  verdict,
  suggestions,
  onPickSuggestion,
  onSkip,
  onBuy,
  onBack,
}: VerdictScreenProps) {
  const { skip, buy } = actionLabels(verdict);
  const c = verdict.candidate;
  const rows = verdict.comparison ?? [];
  const hasUnknown = rows.some((r) => r.kind === 'unknown');

  return (
    <section className="screen fade">
      {suggestions.length > 0 && (
        <div className="didyoumean" role="group" aria-label="Did you mean">
          <div className="dym-head">
            We don&apos;t know <b>“{c.name}”</b> exactly. Did you mean:
          </div>
          <div className="dym-chips">
            {suggestions.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => onPickSuggestion(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="eyebrow">Compared with what you own</div>

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
        <div className="t2" aria-hidden="true">
          {c.icon}
        </div>
        <div>
          <div className="nm">{c.name}</div>
          <div className="mt">
            {c.meta}
            {c.price ? ` · €${c.price.toLocaleString('en-US')}` : ''}
          </div>
        </div>
      </div>

      {rows.length > 0 && verdict.ownedItem && (
        <>
          <div className="cmp" role="table" aria-label="Spec comparison">
            <div className="ch" role="columnheader">
              Spec
            </div>
            <div className="ch r" role="columnheader" title={verdict.ownedItem.name}>
              Yours · {shortName(verdict.ownedItem.name)}
            </div>
            <div className="ch r" role="columnheader" title={c.name}>
              {shortName(c.name)}
            </div>
            {rows.map((r) => (
              <Fragment key={r.k}>
                <div className={`cell lbl${r.importance === 'core' ? ' core' : ''}`} role="cell">
                  {r.k}
                </div>
                <div className={`cell val${r.kind === 'unknown' ? ' muted' : ''}`} role="cell">
                  {r.own}
                </div>
                <div className={`cell new k-${r.kind}`} role="cell">
                  <span>{r.cand}</span>
                  {r.label ? <span className={`delta-pill ${PILL[r.kind]}`}>{r.label}</span> : null}
                </div>
              </Fragment>
            ))}
          </div>
          <div className="legend">
            <span>
              <span className="dot" style={{ background: 'var(--jade)' }} /> Better
            </span>
            <span>
              <span className="dot" style={{ background: 'var(--clay)' }} /> Worse
            </span>
            <span>
              <span className="dot" style={{ background: 'var(--faint)' }} /> Too small to notice
            </span>
            <span>
              <b>Bold</b> specs count double
            </span>
          </div>
          {hasUnknown && (
            <p className="fineprint">“No data” means one side is missing that spec. It isn&apos;t scored either way.</p>
          )}
        </>
      )}

      {isDuplicate(verdict) && (
        <div className="note">
          It&apos;s the same model. If this is a <b>replacement</b> for a broken one, buying is fine,
          and we&apos;ll keep a single entry in your list.
        </div>
      )}

      {!isDuplicate(verdict) && rows.length > 0 && verdict.ownedItem && verdict.kind !== 'buy' && (
        <div className="note">
          If you buy anyway, <b>{verdict.ownedItem.name}</b> moves to “Replaced”. Consider selling it so
          you&apos;re not paying for two.
        </div>
      )}

      {!isDuplicate(verdict) && rows.length === 0 && verdict.ownedItem && suggestions.length === 0 && (
        <div className="note">
          We don&apos;t have specs for this exact model yet. Try the full model name (e.g. “Galaxy S24
          Ultra”), and we&apos;ll compare it spec by spec.
        </div>
      )}

      {/* While we're still asking "which one?", don't let an unidentified item be filed. */}
      {suggestions.length > 0 ? (
        <p className="fineprint">Pick the exact model above to compare it with what you own.</p>
      ) : (
        <div className="actions">
          <button type="button" className="act skip" onClick={onSkip}>
            {skip}
          </button>
          <button type="button" className="act buy" onClick={onBuy}>
            {buy}
          </button>
        </div>
      )}

      <button type="button" className="backlink" onClick={onBack}>
        ← weigh a different item
      </button>
    </section>
  );
}
