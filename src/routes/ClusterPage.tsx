import { Link, useParams } from 'react-router';
import type { DiffResult } from '../api/types';
import { downloadUrl } from '../api/client';
import { useDiff, useHistory, useReport } from '../api/queries';
import { formatRelative, formatTimestamp } from '../lib/format';
import { countBySeverity } from '../lib/severity';
import { Card } from '../components/ui/Card';
import { StatTile } from '../components/ui/StatTile';
import { CollapsibleCard } from '../components/ui/CollapsibleCard';
import { ErrorState, SkeletonCard } from '../components/ui/States';
import { TrendChart } from '../components/TrendChart';
import { DiffPanel } from '../components/DiffPanel';
import './ClusterPage.css';

/**
 * A cluster's overview: how it is doing and what changed. The findings
 * themselves live on the Issues page — this page answers "how bad is it and is
 * it getting worse", and every area here is a link into the filtered list.
 *
 * Serves both shapes: in fleet mode the cluster name comes from the route and
 * the API paths are /api/clusters/{name}/…; in single-cluster mode there is no
 * name and the paths are /api/….
 */
export function ClusterPage({ autoRefresh }: { autoRefresh: boolean }) {
  const cluster = useParams<{ name?: string }>().name ?? null;
  const report = useReport(cluster, true, autoRefresh);
  const history = useHistory(cluster, true);
  const diff = useDiff(cluster, true);

  const issuesPath = cluster ? `/clusters/${encodeURIComponent(cluster)}/issues` : '/issues';

  if (report.isPending) {
    return (
      <div className="stack">
        <SkeletonCard height={96} />
        <SkeletonCard height={200} />
      </div>
    );
  }

  if (report.isError || !report.data) {
    return (
      <Card>
        <ErrorState error={report.error} context="Could not load the report" />
      </Card>
    );
  }

  const r = report.data;
  const s = r.summary;

  return (
    <div className="stack">
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

        {/* No score gauge here — the sidebar already carries it, and two of
            the same number on one screen invites the reader to look for a
            difference between them. */}
        <div className="cluster-page__stats">
          <StatTile label="Health score" value={`${s.score} (${s.grade})`} />
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

      <Card>
        <div className="cluster-page__areas-head">
          <h2 className="cluster-page__section-title">By area</h2>
          <Link to={issuesPath}>All issues →</Link>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th scope="col">Grade</th>
                <th scope="col">Critical</th>
                <th scope="col">Warning</th>
                <th scope="col">Info</th>
              </tr>
            </thead>
            <tbody>
              {(r.sections ?? []).map((sec) => {
                const c = countBySeverity(sec.findings);
                return (
                  <tr key={sec.id}>
                    <th scope="row">
                      <Link to={`${issuesPath}?area=${encodeURIComponent(sec.id)}`}>
                        <span aria-hidden="true">{sec.icon} </span>
                        {sec.title}
                      </Link>
                    </th>
                    <td>{c.total === 0 ? <span className="muted">—</span> : gradeCell(c)}</td>
                    <td className="tabular">{c.critical || <span className="muted">0</span>}</td>
                    <td className="tabular">{c.warning || <span className="muted">0</span>}</td>
                    <td className="tabular">{c.info || <span className="muted">0</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/** A one-glyph verdict per area, so the table scans without reading numbers. */
function gradeCell(c: { critical: number; warning: number; ok: number; total: number }) {
  if (c.critical > 0) {
    return (
      <span className="badge badge--critical">
        <span className="badge__icon" aria-hidden="true">
          ✕
        </span>
        Failing
      </span>
    );
  }
  if (c.warning > 0) {
    return (
      <span className="badge badge--warning">
        <span className="badge__icon" aria-hidden="true">
          !
        </span>
        At risk
      </span>
    );
  }
  return (
    <span className="badge badge--ok">
      <span className="badge__icon" aria-hidden="true">
        ✓
      </span>
      Passing
    </span>
  );
}

/**
 * The run-over-run diff, collapsed once it is long enough to push the rest of
 * the page below the fold. A first run after a long gap can produce dozens of
 * entries.
 */
function DiffSection({ diff }: { diff: DiffResult }) {
  const added = diff.new?.length ?? 0;
  const resolved = diff.resolved?.length ?? 0;
  const changes = added + resolved;

  return (
    <CollapsibleCard
      title="Since the previous run"
      icon="⇄"
      defaultOpen={changes > 0 && changes <= 10}
      summary={
        <>
          {added > 0 && <span className="badge badge--critical">{added} new</span>}
          {resolved > 0 && <span className="badge badge--ok">{resolved} resolved</span>}
          {changes === 0 && <span className="badge badge--neutral">No change</span>}
        </>
      }
    >
      <DiffPanel diff={diff} />
    </CollapsibleCard>
  );
}
