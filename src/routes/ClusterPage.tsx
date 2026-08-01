import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { DiffResult } from '../api/types';
import { downloadUrl } from '../api/client';
import { useDiff, useHistory, useReport } from '../api/queries';
import { defaultFilterState, filterReport } from '../lib/filter';
import { formatRelative, formatTimestamp } from '../lib/format';
import { Card } from '../components/ui/Card';
import { ScoreGauge } from '../components/ui/ScoreGauge';
import { StatTile } from '../components/ui/StatTile';
import { EmptyState, ErrorState, SkeletonCard } from '../components/ui/States';
import { SectionCard } from '../components/SectionCard';
import { Toolbar } from '../components/Toolbar';
import { TrendChart } from '../components/TrendChart';
import { DiffPanel } from '../components/DiffPanel';
import './ClusterPage.css';

/**
 * One cluster's full report. Serves both shapes: in fleet mode the cluster name
 * comes from the route and the API paths are /api/clusters/{name}/…; in
 * single-cluster mode there is no name and the paths are /api/….
 */
export function ClusterPage({ autoRefresh }: { autoRefresh: boolean }) {
  const params = useParams<{ name?: string }>();
  const cluster = params.name ?? null;

  const report = useReport(cluster, true, autoRefresh);
  const history = useHistory(cluster, true);
  const diff = useDiff(cluster, true);

  const [filters, setFilters] = useState(defaultFilterState);

  const filtered = useMemo(
    () => (report.data ? filterReport(report.data, filters) : null),
    [report.data, filters],
  );

  if (report.isPending) {
    return (
      <div className="page stack">
        <SkeletonCard height={96} />
        <SkeletonCard height={64} />
        <SkeletonCard height={200} />
      </div>
    );
  }

  if (report.isError || !report.data || !filtered) {
    return (
      <div className="page">
        <Card>
          <ErrorState error={report.error} context="Could not load the report" />
        </Card>
      </div>
    );
  }

  const r = report.data;
  const s = r.summary;

  return (
    <div className="page stack">
      {cluster && (
        <p className="cluster-page__back">
          <Link to="/">← All clusters</Link>
        </p>
      )}

      <Card>
        <div className="cluster-page__head">
          <div>
            <h1 className="cluster-page__title">{r.clusterName || 'Cluster'}</h1>
            <p className="muted">
              {r.kubernetesVersion && <>Kubernetes {r.kubernetesVersion} · </>}
              {r.context && <>context {r.context} · </>}
              <time dateTime={r.generatedAt} title={formatTimestamp(r.generatedAt)}>
                analyzed {formatRelative(r.generatedAt)}
              </time>
            </p>
          </div>
          <div className="cluster-page__downloads">
            <a className="button" href={downloadUrl(cluster, 'json')} download>
              JSON
            </a>
            <a className="button" href={downloadUrl(cluster, 'markdown')} download>
              Markdown
            </a>
          </div>
        </div>

        <div className="cluster-page__stats">
          <div className="stat-tile cluster-page__score">
            <ScoreGauge score={s.score} grade={s.grade} />
          </div>
          <StatTile label="Critical" value={s.critical} tone="critical" />
          <StatTile label="Warnings" value={s.warnings} tone="warning" />
          <StatTile label="Info" value={s.info} tone="info" />
          <StatTile label="Namespaces" value={s.namespaces} />
        </div>
      </Card>

      {history.data && history.data.length > 0 && (
        <Card>
          <TrendChart entries={history.data} />
        </Card>
      )}

      {diff.data && <DiffSection diff={diff.data} />}

      <Toolbar
        report={r}
        state={filters}
        onChange={setFilters}
        matches={filtered.matches}
        total={filtered.total}
      />

      {filtered.matches === 0 ? (
        <Card>
          <EmptyState
            title="No findings match these filters"
            detail="Widen the severity chips, clear the search box, or pick a different namespace."
          />
        </Card>
      ) : (
        <div className="stack">
          {filtered.namespaces.map((ns) => (
            <SectionCard
              key={`ns-${ns.name}`}
              title={ns.name}
              icon="📦"
              team={ns.team}
              findings={ns.findings ?? []}
            />
          ))}
          {filtered.sections.map((sec) => (
            <SectionCard
              key={sec.id}
              title={sec.title}
              icon={sec.icon}
              findings={sec.findings ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The run-over-run diff, collapsed once it is long enough to push the findings
 * themselves below the fold. A first run after a long gap can produce dozens of
 * entries, and the report is what the page is for.
 */
function DiffSection({ diff }: { diff: DiffResult }) {
  const changes = (diff.new?.length ?? 0) + (diff.resolved?.length ?? 0);

  return (
    <details className="section card" open={changes > 0 && changes <= 10}>
      <summary className="section__summary">
        <span className="section__icon" aria-hidden="true">
          ⇄
        </span>
        <h2 className="section__title">Since the previous run</h2>
        <span className="section__counts">
          {(diff.new?.length ?? 0) > 0 && (
            <span className="badge badge--critical">{diff.new?.length} new</span>
          )}
          {(diff.resolved?.length ?? 0) > 0 && (
            <span className="badge badge--ok">{diff.resolved?.length} resolved</span>
          )}
          {changes === 0 && <span className="badge badge--neutral">No change</span>}
        </span>
        <span className="section__chevron" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="section__body">
        <DiffPanel diff={diff} />
      </div>
    </details>
  );
}
