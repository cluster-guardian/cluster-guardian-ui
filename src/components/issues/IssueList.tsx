import { useState } from 'react';
import type { Issue } from '../../lib/issues';
import { SEVERITY_ICON, SEVERITY_LABEL } from '../../lib/severity';

/**
 * The issue stream. Each row leads with the rule-like message, then the
 * severity and where it came from — the SonarQube reading order, where you
 * scan titles first and only drop into detail on the ones that matter.
 */
export function IssueList({
  issues,
  expandHints = false,
}: {
  issues: Issue[];
  expandHints?: boolean;
}) {
  // Rendering thousands of rows locks the main thread; the page shows a slice
  // and grows on demand rather than paginating, so filtering stays the primary
  // way to narrow.
  const [limit, setLimit] = useState(100);
  const shown = issues.slice(0, limit);

  return (
    <div className="issues">
      <ul className="issues__list">
        {shown.map((issue) => (
          <IssueRow key={issue.key} issue={issue} defaultOpen={expandHints} />
        ))}
      </ul>

      {issues.length > shown.length && (
        <div className="issues__more">
          <button type="button" className="button" onClick={() => setLimit((n) => n + 200)}>
            Show more
          </button>
          <span className="muted">
            Showing <span className="tabular">{shown.length}</span> of{' '}
            <span className="tabular">{issues.length}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue, defaultOpen }: { issue: Issue; defaultOpen: boolean }) {
  const hasDetail = Boolean(issue.hint || issue.controls?.length);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li className="issue">
      <div className="issue__main">
        <span className={`issue__sev issue__sev--${issue.severity}`}>
          <span aria-hidden="true">{SEVERITY_ICON[issue.severity]}</span>
          {SEVERITY_LABEL[issue.severity]}
        </span>

        <div className="issue__body">
          <p className="issue__message">{issue.message}</p>
          <p className="issue__meta">
            <span className="issue__location">{issue.location}</span>
            {issue.object && <span className="mono">{issue.object}</span>}
            {issue.team && <span className="issue__team">{issue.team}</span>}
          </p>
        </div>

        {hasDetail && (
          <button
            type="button"
            className="issue__toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Less' : 'Why'}
          </button>
        )}
      </div>

      {open && (
        <div className="issue__detail">
          {issue.hint && <p className="issue__hint">{issue.hint}</p>}
          {issue.controls && issue.controls.length > 0 && (
            <ul className="issue__controls">
              {issue.controls.map((c) => (
                <li className="issue__control mono" key={c}>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
