import type {
  ClusterRegistration,
  ClustersResponse,
  ClusterStatus,
  DiffResult,
  HistoryEntry,
  HistoryResponse,
  Me,
  Report,
  ServerMode,
  Team,
  TeamsSpec,
} from './types';

/**
 * Where the cluster-guardian API lives. Same-origin by default: in dev Vite
 * proxies /api to CG_URL, and in production the SPA is served next to the Go
 * server (or behind an ingress that routes /api to it). VITE_API_BASE overrides
 * it for split deployments — the Go server sends no CORS headers, so that only
 * works behind a shared origin or a proxy that adds them.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    body: string,
  ) {
    super(body || `${status} ${url}`);
    this.name = 'ApiError';
  }

  /** The backend returns 404 for a cluster it does not know or has not scanned. */
  get isNotFound() {
    return this.status === 404;
  }

  /** The caller's role is too low for this route. */
  get isForbidden() {
    return this.status === 403;
  }

  /**
   * The path exists but not for this method — how a server started without
   * --admin-api answers a write. It means "this deployment does not do that",
   * which is a different thing from "you may not".
   */
  get isUnsupported() {
    return this.status === 405 || this.status === 404;
  }
}

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    signal: opts.signal,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (!res.ok) {
    // Errors come back as text/plain from http.Error, not JSON.
    throw new ApiError(res.status, url, (await res.text()).trim());
  }
  // 204 and an empty body are both legitimate — DELETE returns no content.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>('GET', path, { signal });
}

/** Report and history paths differ between fleet and single-cluster mode. */
export function reportBase(cluster: string | null): string {
  return cluster ? `/api/clusters/${encodeURIComponent(cluster)}` : '/api';
}

export function fetchReport(
  cluster: string | null,
  opts: { refresh?: boolean; signal?: AbortSignal } = {},
): Promise<Report> {
  // ?refresh=true bypasses the server's TTL cache. Fleet reports come from the
  // scan schedule and ignore it, so only send it in single-cluster mode.
  const q = !cluster && opts.refresh ? '?refresh=true' : '';
  return get<Report>(`${reportBase(cluster)}/report${q}`, opts.signal);
}

export async function fetchHistory(
  cluster: string | null,
  signal?: AbortSignal,
): Promise<HistoryEntry[]> {
  const res = await get<HistoryResponse>(`${reportBase(cluster)}/history`, signal);
  return res.entries ?? [];
}

export function fetchDiff(cluster: string | null, signal?: AbortSignal): Promise<DiffResult> {
  return get<DiffResult>(`${reportBase(cluster)}/history/diff`, signal);
}

export async function fetchClusters(signal?: AbortSignal): Promise<ClusterStatus[]> {
  const res = await get<ClustersResponse>('/api/clusters', signal);
  return res.clusters ?? [];
}

/**
 * Probes /api/clusters to learn which mode the backend runs in. A 404 means
 * the route is not mounted, i.e. `serve` without --fleet.
 *
 * The server also reports {"mode": "fleet" | "single-cluster"} from GET /, but
 * that root belongs to the SPA on this origin — the dev proxy and any ingress
 * route only /api, /healthz and /metrics to the backend, so / would return
 * index.html. The 404 probe works under every hosting arrangement.
 */
export async function detectMode(signal?: AbortSignal): Promise<ServerMode> {
  try {
    await fetchClusters(signal);
    return 'fleet';
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return 'single';
    throw err;
  }
}

/** Absolute URLs for the download buttons — the browser navigates to these. */
export function downloadUrl(cluster: string | null, format: 'json' | 'markdown'): string {
  const base = `${API_BASE}${reportBase(cluster)}/report`;
  return format === 'markdown' ? `${base}/markdown` : base;
}

/* ---- Identity --------------------------------------------------------- */

/**
 * Who the caller is and what this deployment can do. Ungated on the server, so
 * it answers even for a caller with no permissions at all — which is exactly
 * when the UI most needs it.
 */
export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return get<Me>('/api/me', signal);
}

/**
 * A server predating roles has no /api/me. Rather than failing the whole app,
 * assume the old behaviour: anonymous, read-only, no write features.
 */
export const LEGACY_ME: Me = {
  identity: { role: 'viewer', anonymous: true, permissions: ['reports:read'] },
  features: { clusters: false, teams: false },
};

export async function fetchMeOrLegacy(signal?: AbortSignal): Promise<Me> {
  try {
    return await fetchMe(signal);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return LEGACY_ME;
    throw err;
  }
}

/* ---- Cluster registration --------------------------------------------- */

export function createCluster(reg: ClusterRegistration, signal?: AbortSignal): Promise<void> {
  return request<void>('POST', '/api/clusters', { body: reg, signal });
}

export function deleteCluster(name: string, signal?: AbortSignal): Promise<void> {
  return request<void>('DELETE', `/api/clusters/${encodeURIComponent(name)}`, { signal });
}

/* ---- Team ownership --------------------------------------------------- */

export async function fetchTeams(signal?: AbortSignal): Promise<Team[]> {
  const res = await get<TeamsSpec>('/api/teams', signal);
  return res.teams ?? [];
}

export async function saveTeams(teams: Team[], signal?: AbortSignal): Promise<Team[]> {
  const res = await request<TeamsSpec>('PUT', '/api/teams', { body: { teams }, signal });
  return res?.teams ?? [];
}
