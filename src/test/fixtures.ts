import type { ClusterStatus, Report } from '../api/types';

/** A small report shaped exactly like e2e/fixtures/run1.json on the Go side. */
export function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    clusterName: 'demo',
    kubernetesVersion: 'v1.31.2',
    generatedAt: '2026-07-26T07:17:42.176099Z',
    namespaces: [
      {
        name: 'payments',
        team: 'payments-team',
        findings: [
          {
            severity: 'warning',
            message: '1 Pod missing resource requests',
            hint: 'Set requests.',
          },
          { severity: 'info', message: '1 Pod missing memory limits' },
        ],
      },
      {
        name: 'shop',
        team: 'shop-team',
        findings: [
          {
            severity: 'critical',
            message: 'Deployment "web" uses :latest tag',
            object: 'deployment/web',
          },
        ],
      },
    ],
    sections: [
      {
        id: 'security',
        title: 'Security',
        icon: '🔒',
        findings: [
          {
            severity: 'critical',
            message: '2 containers running as root',
            controls: ['PSS/restricted:runAsNonRoot'],
          },
          { severity: 'ok', message: 'All namespaces have NetworkPolicies' },
        ],
      },
    ],
    summary: {
      namespaces: 2,
      totalFindings: 5,
      info: 1,
      warnings: 1,
      critical: 2,
      score: 65,
      grade: 'D',
    },
    ...overrides,
  };
}

export function makeCluster(overrides: Partial<ClusterStatus> = {}): ClusterStatus {
  return {
    name: 'prod',
    server: 'https://prod.example.com:6443',
    lastScan: '2026-07-26T07:17:42Z',
    lastScanSeconds: 2.4,
    scans: 12,
    scanErrors: 0,
    summary: {
      namespaces: 4,
      totalFindings: 18,
      info: 6,
      warnings: 9,
      critical: 3,
      score: 55,
      grade: 'F',
    },
    ...overrides,
  };
}
