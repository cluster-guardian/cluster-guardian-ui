import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCluster,
  deleteCluster,
  detectMode,
  fetchClusters,
  fetchDiff,
  fetchHistory,
  fetchReport,
  fetchTeams,
  saveTeams,
} from './client';
import type { ClusterRegistration, Team } from './types';

/**
 * Auto-refresh cadence. The server caches reports for a TTL of its own, so
 * polling faster than this buys nothing but load.
 */
export const REFRESH_INTERVAL_MS = 30_000;

export const keys = {
  mode: ['mode'] as const,
  clusters: ['clusters'] as const,
  teams: ['teams'] as const,
  report: (cluster: string | null) => ['report', cluster] as const,
  history: (cluster: string | null) => ['history', cluster] as const,
  diff: (cluster: string | null) => ['diff', cluster] as const,
};

export function useServerMode() {
  return useQuery({
    queryKey: keys.mode,
    queryFn: ({ signal }) => detectMode(signal),
    staleTime: Infinity, // a server does not switch modes without restarting
    retry: 1,
  });
}

export function useClusters(enabled: boolean, autoRefresh: boolean) {
  return useQuery({
    queryKey: keys.clusters,
    queryFn: ({ signal }) => fetchClusters(signal),
    enabled,
    refetchInterval: autoRefresh ? REFRESH_INTERVAL_MS : false,
  });
}

export function useReport(cluster: string | null, enabled: boolean, autoRefresh: boolean) {
  return useQuery({
    queryKey: keys.report(cluster),
    queryFn: ({ signal }) => fetchReport(cluster, { signal }),
    enabled,
    refetchInterval: autoRefresh ? REFRESH_INTERVAL_MS : false,
  });
}

export function useHistory(cluster: string | null, enabled: boolean) {
  return useQuery({
    queryKey: keys.history(cluster),
    queryFn: ({ signal }) => fetchHistory(cluster, signal),
    enabled,
  });
}

export function useDiff(cluster: string | null, enabled: boolean) {
  return useQuery({
    queryKey: keys.diff(cluster),
    queryFn: ({ signal }) => fetchDiff(cluster, signal),
    enabled,
  });
}

export function useTeams(enabled: boolean) {
  return useQuery({
    queryKey: keys.teams,
    queryFn: ({ signal }) => fetchTeams(signal),
    enabled,
  });
}

/**
 * Registering a cluster changes the fleet, so the cluster list is invalidated
 * on success. The server kicks off a rescan of its own; the new cluster shows
 * up with no summary until that finishes, which is the honest intermediate
 * state rather than a spinner that lies about how long a scan takes.
 */
export function useCreateCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reg: ClusterRegistration) => createCluster(reg),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.clusters }),
  });
}

export function useDeleteCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteCluster(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.clusters }),
  });
}

/**
 * Ownership is stamped onto reports during analysis, so a save shows up in the
 * findings only after the next scan. The team list itself updates immediately.
 */
export function useSaveTeams() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teams: Team[]) => saveTeams(teams),
    onSuccess: (saved) => qc.setQueryData(keys.teams, saved),
  });
}

/**
 * Forces a fresh analysis (single-cluster mode) and pulls the trend and diff
 * along with it — a new run changes all three.
 */
export function useRefresh(cluster: string | null) {
  const qc = useQueryClient();
  return async () => {
    await qc.fetchQuery({
      queryKey: keys.report(cluster),
      queryFn: ({ signal }) => fetchReport(cluster, { refresh: true, signal }),
      staleTime: 0,
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.history(cluster) }),
      qc.invalidateQueries({ queryKey: keys.diff(cluster) }),
      qc.invalidateQueries({ queryKey: keys.clusters }),
    ]);
  };
}
