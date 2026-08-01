import type { Finding } from '../api/types';
import { countBySeverity } from '../lib/severity';
import { SeverityBadge } from './ui/Badge';
import { FindingList } from './FindingList';
import './SectionCard.css';

interface SectionCardProps {
  title: string;
  /** Emoji shipped by the backend section (🔒, 📊, …); namespaces have none. */
  icon?: string;
  /** Owning team, on namespace cards where the mapping is set. */
  team?: string;
  findings: Finding[];
  defaultOpen?: boolean;
}

/**
 * A collapsible group of findings — one per report section or namespace.
 * Built on <details> so the open/closed state, keyboard handling and
 * find-in-page all come from the platform rather than from state we maintain.
 */
export function SectionCard({ title, icon, team, findings, defaultOpen = true }: SectionCardProps) {
  const counts = countBySeverity(findings);

  return (
    <details className="section card" open={defaultOpen}>
      <summary className="section__summary">
        {icon && (
          <span className="section__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 className="section__title">{title}</h2>
        {team && <span className="section__team">{team}</span>}
        <span className="section__counts">
          {counts.critical > 0 && <SeverityBadge severity="critical" count={counts.critical} />}
          {counts.warning > 0 && <SeverityBadge severity="warning" count={counts.warning} />}
          {counts.info > 0 && <SeverityBadge severity="info" count={counts.info} />}
          {counts.ok > 0 && counts.total === counts.ok && <SeverityBadge severity="ok" />}
        </span>
        <span className="section__chevron" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="section__body">
        <FindingList findings={findings} />
      </div>
    </details>
  );
}
