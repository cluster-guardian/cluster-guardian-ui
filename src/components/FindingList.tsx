import type { Finding } from '../api/types';
import { SeverityBadge } from './ui/Badge';
import './FindingList.css';

/**
 * The report's atom. A finding is a severity, a message, and optionally the
 * object it is about, a remediation hint, and the compliance controls it maps
 * to — rendered in that reading order.
 */
export function FindingList({ findings }: { findings: Finding[] }) {
  return (
    <ul className="findings">
      {findings.map((f, i) => (
        <li className="finding" key={`${f.severity}-${f.object ?? ''}-${f.message}-${i}`}>
          <SeverityBadge severity={f.severity} />
          <div className="finding__body">
            <p className="finding__message">{f.message}</p>
            {f.object && <p className="finding__object mono">{f.object}</p>}
            {f.hint && <p className="finding__hint">{f.hint}</p>}
            {f.controls && f.controls.length > 0 && (
              <ul className="finding__controls">
                {f.controls.map((c) => (
                  <li className="finding__control mono" key={c}>
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
