import { useMemo, useState } from 'react';
import { useClusters } from '../api/queries';
import { gradeOf } from '../lib/grade';
import { Card } from '../components/ui/Card';
import { StatTile } from '../components/ui/StatTile';
import { EmptyState, ErrorState, SkeletonCard } from '../components/ui/States';
import { ClusterCard } from '../components/ClusterCard';
import './FleetPage.css';

type SortKey = 'score' | 'name' | 'critical';

/**
 * The fleet scorecard. Clusters sort worst-first by default: the point of the
 * page is to surface the cluster that needs attention, not to list them
 * alphabetically.
 */
export function FleetPage({ autoRefresh }: { autoRefresh: boolean }) {
  const clusters = useClusters(true, autoRefresh);
  const [sort, setSort] = useState<SortKey>('score');

  const sorted = useMemo(() => {
    const list = [...(clusters.data ?? [])];
    return list.sort((a, b) => {
      // A failed scan is the worst possible state — it always floats to the top.
      if (!!a.error !== !!b.error) return a.error ? -1 : 1;
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'critical':
          return (b.summary?.critical ?? 0) - (a.summary?.critical ?? 0);
        case 'score':
        default:
          return (a.summary?.score ?? -1) - (b.summary?.score ?? -1);
      }
    });
  }, [clusters.data, sort]);

  const totals = useMemo(() => {
    const list = clusters.data ?? [];
    const scored = list.filter((c) => c.summary);
    const avg = scored.length
      ? Math.round(scored.reduce((n, c) => n + (c.summary?.score ?? 0), 0) / scored.length)
      : 0;
    return {
      clusters: list.length,
      failing: list.filter((c) => c.error).length,
      critical: list.reduce((n, c) => n + (c.summary?.critical ?? 0), 0),
      warnings: list.reduce((n, c) => n + (c.summary?.warnings ?? 0), 0),
      avgScore: avg,
      avgGrade: gradeOf(avg),
    };
  }, [clusters.data]);

  if (clusters.isPending) {
    return (
      <div className="stack">
        <SkeletonCard height={88} />
        <SkeletonCard height={220} />
      </div>
    );
  }

  if (clusters.isError) {
    return (
      <Card>
        <ErrorState error={clusters.error} context="Could not load the fleet" />
      </Card>
    );
  }

  return (
    <div className="stack">
      <Card>
        <div className="fleet__head">
          <h1 className="fleet__title">Fleet</h1>
          <label className="fleet__sort">
            <span className="visually-hidden">Sort clusters</span>
            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="score">Worst score first</option>
              <option value="critical">Most criticals first</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        <div className="fleet__stats">
          <StatTile label="Clusters" value={totals.clusters} />
          <StatTile label="Average score" value={`${totals.avgScore} (${totals.avgGrade})`} />
          <StatTile label="Critical findings" value={totals.critical} tone="critical" />
          <StatTile label="Warnings" value={totals.warnings} tone="warning" />
          {totals.failing > 0 && (
            <StatTile label="Unreachable" value={totals.failing} tone="critical" />
          )}
        </div>
      </Card>

      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            title="No clusters registered"
            detail="Register one with cluster-guardian cluster add <name> --remote-context <ctx>, or create a Secret labeled cluster-guardian.io/secret-type: cluster in the tool's namespace."
          />
        </Card>
      ) : (
        <ul className="fleet__grid">
          {sorted.map((c) => (
            <ClusterCard key={c.name} cluster={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
