import type { Report, Severity } from '../api/types';
import type { FilterState } from '../lib/filter';
import { ALL_SEVERITIES, namespaceOptions, teamOptions } from '../lib/filter';
import { countBySeverity } from '../lib/severity';
import { SeverityChip } from './ui/Chip';
import './Toolbar.css';

interface ToolbarProps {
  report: Report;
  state: FilterState;
  onChange: (next: FilterState) => void;
  /** "Showing 12 of 240 findings" — rendered here so the count sits with the controls. */
  matches: number;
  total: number;
}

/**
 * One row of controls above the content: severity chips, namespace, team, and
 * free-text search. Filtering never repaints anything — a severity keeps its
 * color whether or not other severities are on screen.
 */
export function Toolbar({ report, state, onChange, matches, total }: ToolbarProps) {
  const namespaces = namespaceOptions(report);
  const teams = teamOptions(report);

  const counts = countBySeverity([
    ...(report.namespaces ?? []).flatMap((n) => n.findings ?? []),
    ...(report.sections ?? []).flatMap((s) => s.findings ?? []),
  ]);

  const toggleSeverity = (s: Severity) => {
    const next = new Set(state.severities);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange({ ...state, severities: next });
  };

  return (
    <div className="toolbar card">
      <div className="toolbar__row">
        <div className="toolbar__chips" role="group" aria-label="Filter by severity">
          {ALL_SEVERITIES.map((s) => (
            <SeverityChip
              key={s}
              severity={s}
              active={state.severities.has(s)}
              count={counts[s]}
              onToggle={toggleSeverity}
            />
          ))}
        </div>

        <label className="toolbar__field">
          <span className="visually-hidden">Search findings</span>
          <input
            type="search"
            className="toolbar__search"
            placeholder="Search findings…"
            value={state.query}
            onChange={(e) => onChange({ ...state, query: e.target.value })}
          />
        </label>

        {namespaces.length > 0 && (
          <label className="toolbar__field">
            <span className="visually-hidden">Filter by namespace</span>
            <select
              className="toolbar__select"
              value={state.namespace ?? ''}
              onChange={(e) => onChange({ ...state, namespace: e.target.value || null })}
            >
              <option value="">All namespaces</option>
              {namespaces.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {teams.length > 0 && (
          <label className="toolbar__field">
            <span className="visually-hidden">Filter by team</span>
            <select
              className="toolbar__select"
              value={state.team ?? ''}
              onChange={(e) => onChange({ ...state, team: e.target.value || null })}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="toolbar__count" aria-live="polite">
        Showing <span className="tabular">{matches}</span> of{' '}
        <span className="tabular">{total}</span> findings
        {(state.namespace || state.team) && ' — cluster-wide sections are hidden while narrowed'}
      </p>
    </div>
  );
}
