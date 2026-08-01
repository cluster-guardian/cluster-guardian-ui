import type { Finding, Report, Severity } from '../api/types';
import { rank } from './severity';

/**
 * A finding flattened out of its section or namespace, so the Issues page can
 * rank the whole report by severity instead of by which group it landed in.
 * The report model has no issue IDs, so identity is derived — see issueKey.
 */
export interface Issue extends Finding {
  /** Section title, or the namespace name. */
  location: string;
  /** "section" | "namespace" — what kind of group it came from. */
  scope: 'section' | 'namespace';
  /** Section id, for filtering by area. */
  area: string;
  /** Owning team, on namespace findings where the mapping is set. */
  team?: string;
  key: string;
}

/**
 * Findings carry no identifier from the server. Location plus object plus
 * message is what the backend's own diff engine keys on, so the same tuple is
 * used here — with the index appended, because a section legitimately contains
 * the same message twice (two containers, same problem).
 */
function issueKey(location: string, f: Finding, index: number): string {
  return `${location}|${f.object ?? ''}|${f.message}|${index}`;
}

/** Flattens a report into one severity-ordered list. */
export function toIssues(report: Report): Issue[] {
  const out: Issue[] = [];

  for (const ns of report.namespaces ?? []) {
    (ns.findings ?? []).forEach((f, i) => {
      out.push({
        ...f,
        location: ns.name,
        scope: 'namespace',
        area: 'workloads',
        team: ns.team,
        key: issueKey(ns.name, f, i),
      });
    });
  }
  for (const sec of report.sections ?? []) {
    (sec.findings ?? []).forEach((f, i) => {
      out.push({
        ...f,
        location: sec.title,
        scope: 'section',
        area: sec.id,
        key: issueKey(sec.title, f, i),
      });
    });
  }

  // Worst first; within a severity, keep the order the analyzer produced,
  // which groups related findings together.
  return out.sort((a, b) => rank(b.severity) - rank(a.severity));
}

export interface IssueFilters {
  severities: Set<Severity>;
  areas: Set<string>;
  namespaces: Set<string>;
  teams: Set<string>;
  query: string;
  /** Only findings mapped to a compliance control. */
  onlyCompliance: boolean;
}

export function emptyIssueFilters(): IssueFilters {
  return {
    // OK findings are the report saying "this is fine" — not an issue.
    severities: new Set<Severity>(['critical', 'warning', 'info']),
    areas: new Set(),
    namespaces: new Set(),
    teams: new Set(),
    query: '',
    onlyCompliance: false,
  };
}

function matchesQuery(i: Issue, needle: string): boolean {
  if (!needle) return true;
  const q = needle.toLowerCase();
  return (
    i.message.toLowerCase().includes(q) ||
    i.location.toLowerCase().includes(q) ||
    (i.object?.toLowerCase().includes(q) ?? false) ||
    (i.hint?.toLowerCase().includes(q) ?? false) ||
    (i.controls?.some((c) => c.toLowerCase().includes(q)) ?? false)
  );
}

/**
 * An empty facet set means "no constraint", not "match nothing" — that is what
 * makes a facet feel like a filter rather than a required choice. Severity is
 * the exception: it is a positive selection, and clearing it deliberately
 * yields nothing.
 */
export function filterIssues(issues: Issue[], f: IssueFilters): Issue[] {
  return issues.filter((i) => {
    if (!f.severities.has(i.severity)) return false;
    if (f.areas.size && !f.areas.has(i.area)) return false;
    if (f.namespaces.size && !(i.scope === 'namespace' && f.namespaces.has(i.location))) {
      return false;
    }
    if (f.teams.size && !(i.team && f.teams.has(i.team))) return false;
    if (f.onlyCompliance && !i.controls?.length) return false;
    return matchesQuery(i, f.query);
  });
}

export interface Facet {
  value: string;
  label: string;
  count: number;
}

/**
 * Counts for one facet, computed against the issues left after *every other*
 * facet is applied. That is what makes the numbers trustworthy: each count is
 * how many results you would get by also selecting that value, so a facet
 * never advertises a count that clicking it cannot produce.
 */
function facetCounts(
  issues: Issue[],
  filters: IssueFilters,
  exclude: keyof IssueFilters,
  valueOf: (i: Issue) => string | string[] | undefined,
): Facet[] {
  const others: IssueFilters = { ...filters, [exclude]: new Set() } as IssueFilters;
  const pool = filterIssues(issues, others);

  const counts = new Map<string, number>();
  for (const i of pool) {
    const v = valueOf(i);
    for (const one of Array.isArray(v) ? v : [v]) {
      if (one) counts.set(one, (counts.get(one) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export interface IssueFacets {
  severities: Facet[];
  areas: Facet[];
  namespaces: Facet[];
  teams: Facet[];
}

export function computeFacets(issues: Issue[], filters: IssueFilters): IssueFacets {
  // Severity counts ignore the severity selection itself, so turning one off
  // does not make its own count vanish.
  const severityPool = filterIssues(issues, {
    ...filters,
    severities: new Set(['critical', 'warning', 'info', 'ok']),
  });
  const sevCounts = new Map<string, number>();
  for (const i of severityPool) sevCounts.set(i.severity, (sevCounts.get(i.severity) ?? 0) + 1);

  return {
    severities: (['critical', 'warning', 'info', 'ok'] as Severity[]).map((s) => ({
      value: s,
      label: s,
      count: sevCounts.get(s) ?? 0,
    })),
    areas: facetCounts(issues, filters, 'areas', (i) => i.area),
    namespaces: facetCounts(issues, filters, 'namespaces', (i) =>
      i.scope === 'namespace' ? i.location : undefined,
    ),
    teams: facetCounts(issues, filters, 'teams', (i) => i.team),
  };
}

/** Toggles a value in a facet set, returning a new set. */
export function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function countActiveFilters(f: IssueFilters): number {
  return (
    f.areas.size + f.namespaces.size + f.teams.size + (f.query ? 1 : 0) + (f.onlyCompliance ? 1 : 0)
  );
}
