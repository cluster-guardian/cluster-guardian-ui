import type { Severity } from '../../api/types';
import { SEVERITY_ICON, SEVERITY_LABEL } from '../../lib/severity';

interface SeverityChipProps {
  severity: Severity;
  active: boolean;
  count: number;
  onToggle: (severity: Severity) => void;
}

/**
 * A toggle, not a link: aria-pressed carries the state so a screen reader hears
 * "Critical, 4, pressed" rather than relying on the opacity change.
 */
export function SeverityChip({ severity, active, count, onToggle }: SeverityChipProps) {
  return (
    <button
      type="button"
      className={`chip chip--${severity}`}
      aria-pressed={active}
      onClick={() => onToggle(severity)}
    >
      <span aria-hidden="true">{SEVERITY_ICON[severity]}</span>
      {SEVERITY_LABEL[severity]}
      <span className="tabular">{count}</span>
    </button>
  );
}
