import type { ReactNode } from 'react';
import { ApiError } from '../../api/client';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state">
      <div className="spinner" role="status" aria-label={label} />
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: ReactNode }) {
  return (
    <div className="state">
      <p className="state__title">{title}</p>
      {detail && <p className="state__detail">{detail}</p>}
    </div>
  );
}

/**
 * Connection failures are the common case in this app — the backend may not be
 * running, or `serve` may be up without --fleet. Say which, and say what to run.
 */
export function ErrorState({ error, context }: { error: unknown; context?: string }) {
  const api = error instanceof ApiError ? error : null;
  const message = error instanceof Error ? error.message : String(error);

  let detail: ReactNode = message;
  if (api?.isNotFound) {
    detail = (
      <>
        The server returned 404 for that route. In fleet mode a cluster only appears once it has
        been scanned; check <code>/api/clusters</code>.
      </>
    );
  } else if (!api) {
    detail = (
      <>
        Could not reach the cluster-guardian API. Start it with{' '}
        <code>cluster-guardian serve --listen 127.0.0.1:8099</code>, or point the UI elsewhere with{' '}
        <code>CG_URL</code>. ({message})
      </>
    );
  }

  return (
    <div className="state" role="alert">
      <p className="state__title">{context ?? 'Something went wrong'}</p>
      <p className="state__detail">{detail}</p>
    </div>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />;
}
