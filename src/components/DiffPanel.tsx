import type { DiffResult, LocatedFinding } from '../api/types';
import { SEVERITY_ICON } from '../lib/severity';
import { EmptyState } from './ui/States';
import './DiffPanel.css';

/**
 * What changed since the previous run. The backend normalizes counts before
 * diffing ("5 Pods" -> "3 Pods" is not new), so everything listed here is a
 * genuinely new or genuinely gone finding.
 */
export function DiffPanel({ diff }: { diff: DiffResult }) {
  const added = diff.new ?? [];
  const resolved = diff.resolved ?? [];

  if (added.length === 0 && resolved.length === 0) {
    return <EmptyState title="Nothing changed since the previous run" />;
  }

  return (
    <div className="diff">
      <DiffColumn title="New" tone="new" findings={added} />
      <DiffColumn title="Resolved" tone="resolved" findings={resolved} />
    </div>
  );
}

function DiffColumn({
  title,
  tone,
  findings,
}: {
  title: string;
  tone: 'new' | 'resolved';
  findings: LocatedFinding[];
}) {
  return (
    <section className="diff__column">
      <h3 className={`diff__heading diff__heading--${tone}`}>
        <span aria-hidden="true">{tone === 'new' ? '▲' : '▼'}</span>
        {title}
        <span className="tabular">{findings.length}</span>
      </h3>
      {findings.length === 0 ? (
        <p className="diff__empty">None</p>
      ) : (
        <ul className="diff__list">
          {findings.map((f, i) => (
            <li className="diff__item" key={`${f.location}-${f.message}-${i}`}>
              <span className={`diff__severity diff__severity--${f.severity}`} aria-hidden="true">
                {SEVERITY_ICON[f.severity]}
              </span>
              <div>
                <p>{f.message}</p>
                <p className="diff__location">
                  {f.location}
                  {f.team && ` · ${f.team}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
