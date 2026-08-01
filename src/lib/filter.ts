import type { Finding, NamespaceSection, Report, Section, Severity } from '../api/types';

export interface FilterState {
  /** Severities to keep. An empty set means "keep nothing" — the chips are
   *  a positive selection, and clearing them all is a legitimate empty view. */
  severities: Set<Severity>;
  namespace: string | null;
  team: string | null;
  query: string;
}

export const ALL_SEVERITIES: Severity[] = ['critical', 'warning', 'info', 'ok'];

/** Info and OK are noisy on first load; criticals and warnings are the job. */
export function defaultFilterState(): FilterState {
  return {
    severities: new Set<Severity>(['critical', 'warning', 'info']),
    namespace: null,
    team: null,
    query: '',
  };
}

function matchesQuery(f: Finding, needle: string): boolean {
  if (!needle) return true;
  const q = needle.toLowerCase();
  return (
    f.message.toLowerCase().includes(q) ||
    (f.object?.toLowerCase().includes(q) ?? false) ||
    (f.hint?.toLowerCase().includes(q) ?? false) ||
    (f.controls?.some((c) => c.toLowerCase().includes(q)) ?? false)
  );
}

function filterFindings(findings: Finding[] | null | undefined, state: FilterState): Finding[] {
  return (findings ?? []).filter(
    (f) => state.severities.has(f.severity) && matchesQuery(f, state.query),
  );
}

export interface FilteredReport {
  namespaces: NamespaceSection[];
  sections: Section[];
  /** Findings left after filtering, across everything. Drives the empty state. */
  matches: number;
  /** Findings before filtering — "showing 12 of 240". */
  total: number;
}

/**
 * Filtering is a pure transform over the report, mirroring how the Go side
 * treats checks: given the same report and state, always the same view. Groups
 * that end up empty are dropped rather than rendered as empty cards.
 */
export function filterReport(report: Report, state: FilterState): FilteredReport {
  const namespaces: NamespaceSection[] = [];
  const sections: Section[] = [];
  let matches = 0;
  let total = 0;

  for (const ns of report.namespaces ?? []) {
    total += (ns.findings ?? []).length;
    if (state.namespace && ns.name !== state.namespace) continue;
    if (state.team && ns.team !== state.team) continue;
    const findings = filterFindings(ns.findings, state);
    matches += findings.length;
    if (findings.length) namespaces.push({ ...ns, findings });
  }

  for (const sec of report.sections ?? []) {
    total += (sec.findings ?? []).length;
    // Cluster-wide sections are not attributable to one namespace or team, so
    // narrowing to either hides them — the same rule report.FilterTeam applies.
    if (state.namespace || state.team) continue;
    const findings = filterFindings(sec.findings, state);
    matches += findings.length;
    if (findings.length) sections.push({ ...sec, findings });
  }

  return { namespaces, sections, matches, total };
}

/** Namespace names present in the report, sorted, for the dropdown. */
export function namespaceOptions(report: Report): string[] {
  return (report.namespaces ?? []).map((ns) => ns.name).sort((a, b) => a.localeCompare(b));
}

/** Distinct teams, sorted — mirrors Report.Teams() in Go. */
export function teamOptions(report: Report): string[] {
  const seen = new Set<string>();
  for (const ns of report.namespaces ?? []) {
    if (ns.team) seen.add(ns.team);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
