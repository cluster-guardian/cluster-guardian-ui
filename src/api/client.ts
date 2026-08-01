import type {
  ClustersResponse,
  ClusterStatus,
  DiffResult,
  HistoryEntry,
  HistoryResponse,
  Report,
  ServerMode,
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
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    // Errors come back as text/plain from http.Error, not JSON.
    throw new ApiError(res.status, url, (await res.text()).trim());
  }
  return (await res.json()) as T;
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
