import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { useReport, useServerMode } from './api/queries';
import { useSession } from './api/session-context';
import { AppShell } from './components/shell/AppShell';
import { Breadcrumbs, type Crumb } from './components/shell/Breadcrumbs';
import type { SidebarSection } from './components/shell/Sidebar';
import { ScoreGauge } from './components/ui/ScoreGauge';
import { Card } from './components/ui/Card';
import { ErrorState, SkeletonCard } from './components/ui/States';
import { ClusterPage } from './routes/ClusterPage';
import { FleetPage } from './routes/FleetPage';
import { IssuesPage } from './routes/IssuesPage';
import { NotFound } from './routes/NotFound';
import { AccessSettings } from './routes/settings/AccessSettings';
import { ClustersSettings } from './routes/settings/ClustersSettings';
import { PreferencesSettings } from './routes/settings/PreferencesSettings';
import { TeamsSettings } from './routes/settings/TeamsSettings';
import { loadPreferences, savePreferences, type Preferences } from './lib/preferences';

/**
 * The same binary serves two shapes, and the SPA adapts rather than being
 * configured: with --fleet the root is the scorecard and clusters live under
 * /clusters/{name}; without it there is one cluster and the root *is* its
 * dashboard.
 */
export function App() {
  const mode = useServerMode();
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences);

  useEffect(() => savePreferences(prefs), [prefs]);
  useEffect(() => {
    document.documentElement.dataset.density = prefs.density;
  }, [prefs.density]);

  if (mode.isPending) {
    return (
      <AppShell>
        <SkeletonCard height={88} />
      </AppShell>
    );
  }

  if (mode.isError) {
    return (
      <AppShell>
        <Card>
          <ErrorState error={mode.error} context="Could not reach cluster-guardian" />
        </Card>
      </AppShell>
    );
  }

  const isFleet = mode.data === 'fleet';

  return (
    <Routes>
      {/* Fleet overview, or the single cluster's dashboard at the root. */}
      <Route
        path="/"
        element={
          isFleet ? (
            prefs.landing === 'issues' ? (
              <Navigate to="/issues" replace />
            ) : (
              <AppShell>
                <FleetPage autoRefresh={prefs.autoRefresh} />
              </AppShell>
            )
          ) : (
            <ClusterScoped prefs={prefs}>
              <ClusterPage autoRefresh={prefs.autoRefresh} />
            </ClusterScoped>
          )
        }
      />

      {/* Single-cluster mode: no cluster in the path. */}
      <Route
        path="/issues"
        element={
          <ClusterScoped prefs={prefs}>
            <IssuesPage prefs={prefs} />
          </ClusterScoped>
        }
      />

      {/* Fleet mode: per-cluster pages. */}
      <Route
        path="/clusters/:name"
        element={
          <ClusterScoped prefs={prefs}>
            <ClusterPage autoRefresh={prefs.autoRefresh} />
          </ClusterScoped>
        }
      />
      <Route
        path="/clusters/:name/issues"
        element={
          <ClusterScoped prefs={prefs}>
            <IssuesPage prefs={prefs} />
          </ClusterScoped>
        }
      />

      <Route path="/settings" element={<Navigate to="/settings/preferences" replace />} />
      <Route
        path="/settings/:section"
        element={<SettingsScoped prefs={prefs} onPrefsChange={setPrefs} />}
      />

      <Route
        path="*"
        element={
          <AppShell>
            <NotFound />
          </AppShell>
        }
      />
    </Routes>
  );
}

/**
 * The top-level destinations, repeated in the drawer for narrow viewports
 * where the global bar collapses. Without it Settings is unreachable on a
 * phone: the burger opens this sidebar, not the bar.
 */
const GLOBAL_SECTION: SidebarSection = {
  title: 'Go to',
  mobileOnly: true,
  items: [
    { label: 'Home', to: '/', end: true },
    { label: 'Settings', to: '/settings' },
  ],
};

/**
 * Wraps a cluster page in the shell with that cluster's sidebar. The sidebar
 * carries live severity counts, which is why it needs the report: a navigation
 * item that says "Issues 14" is worth more than one that says "Issues".
 */
function ClusterScoped({ prefs, children }: { prefs: Preferences; children: React.ReactNode }) {
  const cluster = useParams<{ name?: string }>().name ?? null;
  const { pathname } = useLocation();
  const report = useReport(cluster, true, prefs.autoRefresh);
  const summary = report.data?.summary;

  const base = cluster ? `/clusters/${encodeURIComponent(cluster)}` : '';

  const sidebar: SidebarSection[] = useMemo(
    () => [
      {
        items: [
          { label: 'Overview', to: base || '/', end: true },
          {
            label: 'Issues',
            to: `${base}/issues`,
            badge: summary ? summary.critical + summary.warnings : undefined,
            badgeTone: summary?.critical ? 'critical' : 'warning',
          },
        ],
      },
      GLOBAL_SECTION,
    ],
    [base, summary],
  );

  const crumbs: Crumb[] = cluster
    ? [
        { label: 'Fleet', to: '/' },
        { label: cluster, to: base },
        ...(pathname.endsWith('/issues') ? [{ label: 'Issues' }] : []),
      ]
    : pathname.endsWith('/issues')
      ? [{ label: report.data?.clusterName ?? 'Cluster', to: '/' }, { label: 'Issues' }]
      : [];

  return (
    <AppShell
      sidebar={sidebar}
      sidebarHeader={
        summary ? <ScoreGauge score={summary.score} grade={summary.grade} size={52} /> : undefined
      }
      breadcrumbs={crumbs.length > 0 ? <Breadcrumbs items={crumbs} /> : undefined}
    >
      {children}
    </AppShell>
  );
}

/** Settings, with its own sidebar. Sections the deployment lacks are omitted. */
function SettingsScoped({
  prefs,
  onPrefsChange,
}: {
  prefs: Preferences;
  onPrefsChange: (p: Preferences) => void;
}) {
  const { section } = useParams<{ section: string }>();
  const { features } = useSession();

  const sidebar: SidebarSection[] = [
    {
      title: 'Settings',
      items: [
        { label: 'Preferences', to: '/settings/preferences' },
        { label: 'Access', to: '/settings/access' },
        // Clusters and Teams are omitted rather than shown broken when the
        // server has no write API — there is nothing on those pages to see.
        ...(features.clusters ? [{ label: 'Clusters', to: '/settings/clusters' }] : []),
        ...(features.teams ? [{ label: 'Teams', to: '/settings/teams' }] : []),
      ],
    },
    GLOBAL_SECTION,
  ];

  const SECTION_LABEL: Record<string, string> = {
    preferences: 'Preferences',
    access: 'Access',
    clusters: 'Clusters',
    teams: 'Teams',
  };

  const body =
    section === 'clusters' && features.clusters ? (
      <ClustersSettings />
    ) : section === 'teams' ? (
      <TeamsSettings />
    ) : section === 'access' ? (
      <AccessSettings />
    ) : section === 'preferences' ? (
      <PreferencesSettings prefs={prefs} onChange={onPrefsChange} />
    ) : (
      <NotFound />
    );

  return (
    <AppShell
      sidebar={sidebar}
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Settings', to: '/settings' },
            { label: SECTION_LABEL[section ?? ''] ?? 'Not found' },
          ]}
        />
      }
    >
      {body}
    </AppShell>
  );
}
