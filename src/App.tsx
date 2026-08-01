import { useState } from 'react';
import { Route, Routes } from 'react-router';
import { useRefresh, useServerMode } from './api/queries';
import { AppHeader } from './components/AppHeader';
import { Card } from './components/ui/Card';
import { ErrorState, SkeletonCard } from './components/ui/States';
import { ClusterPage } from './routes/ClusterPage';
import { FleetPage } from './routes/FleetPage';
import { NotFound } from './routes/NotFound';

/**
 * The same binary serves two shapes, and the SPA adapts rather than being
 * configured: with --fleet the root is the scorecard and clusters live under
 * /clusters/{name}; without it there is one cluster and the root *is* its
 * dashboard. detectMode() probes /api/clusters once to find out which.
 */
export function App() {
  const mode = useServerMode();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useRefresh(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <AppHeader
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={setAutoRefresh}
        // Only single-cluster mode can force an analysis; fleet reports come
        // from the scan schedule and ignore ?refresh.
        onRefresh={mode.data === 'single' ? handleRefresh : undefined}
        refreshing={refreshing}
      />

      {mode.isPending && (
        <div className="page stack">
          <SkeletonCard height={88} />
          <SkeletonCard height={220} />
        </div>
      )}

      {mode.isError && (
        <div className="page">
          <Card>
            <ErrorState error={mode.error} context="Could not reach cluster-guardian" />
          </Card>
        </div>
      )}

      {mode.data && (
        <Routes>
          <Route
            path="/"
            element={
              mode.data === 'fleet' ? (
                <FleetPage autoRefresh={autoRefresh} />
              ) : (
                <ClusterPage autoRefresh={autoRefresh} />
              )
            }
          />
          <Route path="/clusters/:name" element={<ClusterPage autoRefresh={autoRefresh} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}

      <footer className="app-footer">
        <a href="https://github.com/cluster-guardian/cluster-guardian">cluster-guardian</a> ·{' '}
        {mode.data === 'fleet' ? 'fleet mode' : mode.data === 'single' ? 'single cluster' : ''}
      </footer>
    </>
  );
}
