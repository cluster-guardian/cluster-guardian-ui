/**
 * Mirrors the Go wire model. Keep these in lockstep with:
 *   internal/report/model.go   — Severity, Finding, Section, NamespaceSection, Summary, Report
 *   internal/report/diff.go    — LocatedFinding, DiffResult
 *   internal/history/history.go — Entry
 *   internal/fleet/manager.go  — Status
 *
 * Severity marshals to/from its string name on the Go side (Severity.MarshalJSON),
 * so it arrives as a string, never an int.
 */

export const SEVERITIES = ['critical', 'warning', 'info', 'ok'] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface Finding {
  severity: Severity;
  message: string;
  object?: string;
  hint?: string;
  /** Compliance controls, e.g. "PSS/baseline:privileged". */
  controls?: string[];
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  findings: Finding[] | null;
}

export interface NamespaceSection {
  name: string;
  team?: string;
  findings: Finding[] | null;
}

export interface Summary {
  namespaces: number;
  totalFindings: number;
  info: number;
  warnings: number;
  critical: number;
  score: number;
  grade: Grade;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Report {
  clusterName: string;
  context?: string;
  kubernetesVersion?: string;
  generatedAt: string;
  namespaces: NamespaceSection[] | null;
  sections: Section[] | null;
  summary: Summary;
}

export interface HistoryEntry {
  time: string;
  summary: Summary;
}

export interface HistoryResponse {
  entries: HistoryEntry[] | null;
}

export interface LocatedFinding extends Finding {
  /** A section title, or "namespace <name>". */
  location: string;
  team?: string;
}

export interface DiffResult {
  new: LocatedFinding[] | null;
  resolved: LocatedFinding[] | null;
}

export interface ClusterStatus {
  name: string;
  server: string;
  lastScan: string;
  lastScanSeconds?: number;
  scans: number;
  scanErrors: number;
  error?: string;
  summary?: Summary;
}

export interface ClustersResponse {
  clusters: ClusterStatus[] | null;
}

/**
 * Which shape the backend is running in. `serve` mounts /api/clusters only
 * with --fleet, so a 404 on that route is how single-cluster mode announces
 * itself — there is no version or capability endpoint to ask.
 */
export type ServerMode = 'fleet' | 'single';

/* ---- Identity and permissions ---------------------------------------- *
 * Mirrors internal/auth/auth.go. Roles are ordered; permissions are what the
 * UI actually branches on, so a new role on the server needs no change here.
 */

export const ROLES = ['none', 'viewer', 'operator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = ['reports:read', 'teams:write', 'clusters:write'] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface Identity {
  user?: string;
  groups?: string[] | null;
  role: Role;
  anonymous: boolean;
  permissions: Permission[] | null;
}

/**
 * Whether this deployment has the write API at all — separate from the
 * caller's role. An admin talking to a server started without --admin-api
 * still cannot manage anything, and the UI must say so rather than offering
 * buttons that 404.
 */
export interface Features {
  clusters: boolean;
  teams: boolean;
}

export interface Me {
  identity: Identity;
  features: Features;
}

/* ---- Team ownership --------------------------------------------------- */

/** Webhook URLs come back as this; sending it back unchanged keeps the stored value. */
export const REDACTED_URL = '***';

export interface Team {
  name: string;
  namespaces: string[];
  /** REDACTED_URL when one is configured, absent when not. */
  notifyUrl?: string;
}

export interface TeamsSpec {
  teams: Team[] | null;
}

/* ---- Cluster registration --------------------------------------------- */

export interface ClusterRegistration {
  name: string;
  server: string;
  bearerToken: string;
  /** base64 PEM bundle, as it appears in a kubeconfig. */
  caData?: string;
  insecure?: boolean;
}
