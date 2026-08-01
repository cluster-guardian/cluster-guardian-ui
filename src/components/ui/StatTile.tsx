import type { Severity } from '../../api/types';

interface StatTileProps {
  label: string;
  value: number | string;
  /** Tints the number with the matching severity ink. Omit for neutral counts. */
  tone?: Severity;
}

export function StatTile({ label, value, tone }: StatTileProps) {
  return (
    <div className="stat-tile">
      <span className={`stat-tile__value ${tone ? `stat-tile__value--${tone}` : ''}`.trim()}>
        {value}
      </span>
      <span className="stat-tile__label">{label}</span>
    </div>
  );
}
