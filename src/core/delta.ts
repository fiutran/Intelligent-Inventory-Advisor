import type { DeltaKind, DeltaRow, OwnedItem, Spec } from './types.js';

function classifySpec(owned: Spec | undefined, candidate: Spec): { kind: DeltaKind; label: string } {
  if (!owned) return { kind: 'new', label: 'New' };
  if (owned.v === candidate.v) return { kind: 'same', label: '' };
  return owned.w === 'high'
    ? { kind: 'mean', label: 'Meaningful' }
    : { kind: 'marg', label: 'Marginal' };
}

export function compareSpecs(ownedItem: OwnedItem, candidateSpecs: Spec[]): DeltaRow[] {
  return candidateSpecs.map((cs) => {
    const os = ownedItem.specs.find((o) => o.k === cs.k);
    const { kind, label } = classifySpec(os, cs);
    return {
      k: cs.k,
      own: os?.v ?? '-',
      cand: cs.v,
      kind,
      label,
    };
  });
}

export function summarizeDelta(rows: DeltaRow[]): {
  meaningful: number;
  marginal: number;
  newCount: number;
  realGains: number;
} {
  const meaningful = rows.filter((r) => r.kind === 'mean').length;
  const marginal = rows.filter((r) => r.kind === 'marg').length;
  const newCount = rows.filter((r) => r.kind === 'new').length;
  return {
    meaningful,
    marginal,
    newCount,
    realGains: meaningful + newCount,
  };
}

export function costPerGain(price: number | null, realGains: number): number | null {
  if (!price || !realGains) return null;
  return Math.round(price / realGains);
}
