import type { Severity } from '../api/types';

/**
 * UI preferences. These are genuinely the viewer's, not the deployment's, so
 * they live in localStorage rather than on the server — no API call, no role
 * needed, and two people looking at the same cluster can differ.
 */
export interface Preferences {
  /** Severities selected by default on the Issues page. */
  defaultSeverities: Severity[];
  /** Poll the API in the background. */
  autoRefresh: boolean;
  /** Seconds between polls. */
  refreshSeconds: number;
  /** Where "/" lands in fleet mode. */
  landing: 'fleet' | 'issues';
  /** Compact rows fit more on screen at the cost of scannability. */
  density: 'comfortable' | 'compact';
  /** Expand a finding's remediation hint without clicking. */
  expandHints: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  defaultSeverities: ['critical', 'warning', 'info'],
  autoRefresh: false,
  refreshSeconds: 30,
  landing: 'fleet',
  density: 'comfortable',
  expandHints: false,
};

const STORAGE_KEY = 'cg-preferences';

/**
 * Reads stored preferences, merged over the defaults. A stored blob written by
 * an older version is missing whatever keys were added since, and a corrupt
 * one should not brick the app — both fall back rather than throw.
 */
export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return sanitize({ ...DEFAULT_PREFERENCES, ...parsed });
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(prefs)));
  } catch {
    // A full or disabled localStorage is not worth failing a render over.
  }
}

export function clearPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see savePreferences */
  }
}

/** Clamps anything a hand-edited or stale blob could have put out of range. */
function sanitize(p: Preferences): Preferences {
  const valid: Severity[] = ['critical', 'warning', 'info', 'ok'];
  return {
    ...p,
    defaultSeverities: Array.isArray(p.defaultSeverities)
      ? p.defaultSeverities.filter((s) => valid.includes(s))
      : DEFAULT_PREFERENCES.defaultSeverities,
    // A 1-second poll would hammer a server whose own cache TTL is 60s.
    refreshSeconds: Math.min(600, Math.max(10, Number(p.refreshSeconds) || 30)),
    landing: p.landing === 'issues' ? 'issues' : 'fleet',
    density: p.density === 'compact' ? 'compact' : 'comfortable',
    autoRefresh: Boolean(p.autoRefresh),
    expandHints: Boolean(p.expandHints),
  };
}
