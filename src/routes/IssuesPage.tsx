import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useReport } from '../api/queries';
import type { Preferences } from '../lib/preferences';
import {
  computeFacets,
  countActiveFilters,
  emptyIssueFilters,
  filterIssues,
  toIssues,
  type IssueFilters,
} from '../lib/issues';
import { FilterRail } from '../components/issues/FilterRail';
import { IssueList } from '../components/issues/IssueList';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, SkeletonCard } from '../components/ui/States';
import '../components/issues/issues.css';

/**
 * Every finding in the report as one filterable stream, rather than buried in
 * per-section cards. This is the page for "what is wrong and what do I fix
 * first"; the Overview is for "how are we doing".
 */
export function IssuesPage({ prefs }: { prefs: Preferences }) {
  const cluster = useParams<{ name?: string }>().name ?? null;
  const report = useReport(cluster, true, prefs.autoRefresh);
  const [params] = useSearchParams();

  // The Overview links here pre-filtered by area, so "Security · 3 critical"
  // lands on exactly those three rather than on the whole list.
  const [filters, setFilters] = useState<IssueFilters>(() => {
    const initial = emptyIssueFilters();
    initial.severities = new Set(prefs.defaultSeverities);
    const area = params.get('area');
    if (area) initial.areas = new Set([area]);
    return initial;
  });

  const reset = () => {
    const next = emptyIssueFilters();
    next.severities = new Set(prefs.defaultSeverities);
    setFilters(next);
  };

  const issues = useMemo(() => (report.data ? toIssues(report.data) : []), [report.data]);
  const shown = useMemo(() => filterIssues(issues, filters), [issues, filters]);
  const facets = useMemo(() => computeFacets(issues, filters), [issues, filters]);
  const active = countActiveFilters(filters);

  if (report.isPending) return <SkeletonCard height={400} />;
  if (report.isError || !report.data) {
    return (
      <Card>
        <ErrorState error={report.error} context="Could not load the report" />
      </Card>
    );
  }

  return (
    <>
      <div className="issues-page__head">
        <h1 className="issues-page__title">Issues</h1>
        <span className="issues-page__count">
          <span className="tabular">{shown.length}</span>
          {shown.length !== issues.length && (
            <>
              {' '}
              of <span className="tabular">{issues.length}</span>
            </>
          )}{' '}
          {issues.length === 1 ? 'finding' : 'findings'}
        </span>
      </div>

      <div className="issues-page">
        <FilterRail
          facets={facets}
          filters={filters}
          onChange={setFilters}
          onReset={reset}
          activeCount={active}
        />

        {shown.length === 0 ? (
          <Card>
            <EmptyState
              title={issues.length === 0 ? 'No findings' : 'No issues match these filters'}
              detail={
                issues.length === 0
                  ? 'This report is clean — nothing to fix.'
                  : 'Widen the severity selection, clear the search box, or drop a facet.'
              }
            />
          </Card>
        ) : (
          <IssueList issues={shown} expandHints={prefs.expandHints} />
        )}
      </div>
    </>
  );
}
