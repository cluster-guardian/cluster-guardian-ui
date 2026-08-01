import { Link } from 'react-router';
import type { ClusterStatus } from '../api/types';
import { formatDuration, formatRelative } from '../lib/format';
import { ScoreGauge } from './ui/ScoreGauge';
import { SeverityBadge } from './ui/Badge';
import './ClusterCard.css';

/**
 * One cluster on the fleet overview. A cluster that failed to scan still gets
 * a card — an unreachable cluster is itself the finding, and hiding it would
 * make the fleet look healthier than it is.
 */
export function ClusterCard({ cluster }: { cluster: ClusterStatus }) {
  const { summary, error } = cluster;
  const neverScanned = !summary && !error;

  return (
    <li className="cluster-card card">
      <Link className="cluster-card__link" to={`/clusters/${encodeURIComponent(cluster.name)}`}>
        <div className="cluster-card__head">
          <h2 className="cluster-card__name">{cluster.name}</h2>
          {error && <span className="badge badge--critical">Scan failed</span>}
        </div>

        <p className="cluster-card__server mono">{cluster.server}</p>

        {summary && (
          <>
            <ScoreGauge score={summary.score} grade={summary.grade} caption={null} />
            <div className="cluster-card__counts">
              {summary.critical > 0 && (
                <SeverityBadge severity="critical" count={summary.critical} />
              )}
              {summary.warnings > 0 && (
                <SeverityBadge severity="warning" count={summary.warnings} />
              )}
              {summary.info > 0 && <SeverityBadge severity="info" count={summary.info} />}
              {summary.totalFindings === 0 && <SeverityBadge severity="ok" />}
            </div>
          </>
        )}

        {error && <p className="cluster-card__error">{error}</p>}
        {neverScanned && <p className="cluster-card__error">Not scanned yet</p>}

        <dl className="cluster-card__meta">
          <div>
            <dt>Last scan</dt>
            <dd>{cluster.scans > 0 ? formatRelative(cluster.lastScan) : '—'}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{formatDuration(cluster.lastScanSeconds)}</dd>
          </div>
          <div>
            <dt>Scans</dt>
            <dd className="tabular">
              {cluster.scans}
              {cluster.scanErrors > 0 && ` (${cluster.scanErrors} failed)`}
            </dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}
