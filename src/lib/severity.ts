import type { Finding, Severity } from '../api/types';
import { SEVERITIES } from '../api/types';

/** Matches the Go iota order: ok < info < warning < critical. */
const RANK: Record<Severity, number> = { ok: 0, info: 1, warning: 2, critical: 3 };

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
  ok: 'OK',
};

/**
 * Every severity ships with a glyph as well as a color, so the level never
 * rides on hue alone (the status colors sit below 3:1 on some surfaces).
 */
export const SEVERITY_ICON: Record<Severity, string> = {
  critical: '✕', // ✕
  warning: '!', // !
  info: 'ℹ', // ℹ
  ok: '✓', // ✓
};

export function rank(s: Severity): number {
  return RANK[s] ?? 0;
}

/** Highest severity first — the order findings are read in. */
export function compareSeverity(a: Severity, b: Severity): number {
  return rank(b) - rank(a);
}

export function maxSeverity(findings: Finding[] | null | undefined): Severity {
  let highest: Severity = 'ok';
  for (const f of findings ?? []) {
    if (rank(f.severity) > rank(highest)) highest = f.severity;
  }
  return highest;
}

export interface SeverityCounts {
  critical: number;
  warning: number;
  info: number;
  ok: number;
  total: number;
}

export function countBySeverity(findings: Finding[] | null | undefined): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, warning: 0, info: 0, ok: 0, total: 0 };
  for (const f of findings ?? []) {
    if (f.severity in counts) counts[f.severity]++;
    counts.total++;
  }
  return counts;
}

/** Severity order for filter chips and legends: worst first. */
export const SEVERITY_ORDER: readonly Severity[] = SEVERITIES;
