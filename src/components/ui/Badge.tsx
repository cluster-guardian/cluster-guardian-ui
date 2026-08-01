import type { Severity } from '../../api/types';
import { SEVERITY_ICON, SEVERITY_LABEL } from '../../lib/severity';

interface SeverityBadgeProps {
  severity: Severity;
  /** Prefix the label with a count: "3 Critical". */
  count?: number;
}

/**
 * Severity always renders as icon + word, never as color alone: two of the
 * status colors sit below 3:1 on the light surface, and the pairing is what
 * makes them legible there and under CVD.
 */
export function SeverityBadge({ severity, count }: SeverityBadgeProps) {
  return (
    <span className={`badge badge--${severity}`}>
      <span className="badge__icon" aria-hidden="true">
        {SEVERITY_ICON[severity]}
      </span>
      {count !== undefined && <span className="tabular">{count}</span>}
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function NeutralBadge({ children }: { children: React.ReactNode }) {
  return <span className="badge badge--neutral">{children}</span>;
}
