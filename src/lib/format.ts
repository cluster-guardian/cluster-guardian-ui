/** Absolute timestamp in the viewer's locale — used in tooltips and titles. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Short axis label for the trend chart. */
export function formatShortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });
}

const UNITS: [limit: number, seconds: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60, 1, 'second'],
  [3600, 60, 'minute'],
  [86400, 3600, 'hour'],
  [2592000, 86400, 'day'],
  [31536000, 2592000, 'month'],
  [Infinity, 31536000, 'year'],
];

/** "4 minutes ago". `now` is injectable so the unit tests are not clock-dependent. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';
  const deltaSeconds = (then.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(deltaSeconds);
  if (abs < 10) return 'just now';
  const fmt = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [limit, seconds, unit] of UNITS) {
    if (abs < limit) return fmt.format(Math.round(deltaSeconds / seconds), unit);
  }
  return '—';
}

/** Scan durations arrive as fractional seconds. */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || Number.isNaN(seconds)) return '—';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  return `${Math.floor(seconds / 60)} m ${Math.round(seconds % 60)} s`;
}

/** "1 Pod" / "2 Pods" without dragging in a pluralization library. */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
