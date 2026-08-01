import { useState } from 'react';
import { ApiError } from '../../api/client';
import { useClusters, useCreateCluster, useDeleteCluster } from '../../api/queries';
import { useCan, useDenialReason } from '../../api/session-context';
import type { ClusterRegistration } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, SkeletonCard } from '../../components/ui/States';
import { formatRelative } from '../../lib/format';
import { PermissionNotice, SettingsHeader } from './SettingsLayout';

/**
 * Registered clusters, and adding or removing one. Registration stores
 * credentials the operator supplies — the hub cannot provision them, because
 * that needs admin rights on the target cluster it deliberately does not have.
 */
export function ClustersSettings() {
  const can = useCan();
  const why = useDenialReason();
  const clusters = useClusters(true, false);
  const remove = useDeleteCluster();
  const [adding, setAdding] = useState(false);

  const mayWrite = can('clusters:write');

  return (
    <>
      <SettingsHeader
        title="Clusters"
        description="Clusters scanned by this instance. The local cluster is always included and cannot be removed."
        actions={
          mayWrite && !adding ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => setAdding(true)}
            >
              Add cluster
            </button>
          ) : undefined
        }
      />

      {!mayWrite && <PermissionNotice reason={why('clusters:write') ?? ''} />}

      {adding && <AddClusterForm onDone={() => setAdding(false)} />}

      {clusters.isPending && <SkeletonCard height={200} />}
      {clusters.isError && (
        <Card>
          <ErrorState error={clusters.error} context="Could not list clusters" />
        </Card>
      )}

      {clusters.data && (
        <Card flush>
          {clusters.data.length === 0 ? (
            <EmptyState title="No clusters registered" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Server</th>
                    <th scope="col">Last scan</th>
                    <th scope="col">Status</th>
                    {mayWrite && <th scope="col" className="table__actions" />}
                  </tr>
                </thead>
                <tbody>
                  {clusters.data.map((c) => {
                    // The local cluster is synthesized by the registry, not
                    // backed by a Secret, so there is nothing to delete.
                    const isLocal = c.server === 'local';
                    return (
                      <tr key={c.name}>
                        <th scope="row">{c.name}</th>
                        <td className="mono">{isLocal ? 'in-cluster' : c.server}</td>
                        <td>{c.scans > 0 ? formatRelative(c.lastScan) : 'never'}</td>
                        <td>
                          {c.error ? (
                            <span className="badge badge--critical">Scan failed</span>
                          ) : c.summary ? (
                            <span className="badge badge--neutral">
                              {c.summary.grade} · {c.summary.score}
                            </span>
                          ) : (
                            <span className="muted">pending</span>
                          )}
                        </td>
                        {mayWrite && (
                          <td className="table__actions">
                            {!isLocal && (
                              <button
                                type="button"
                                className="button"
                                disabled={remove.isPending}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Remove ${c.name} from the fleet? Its stored credentials are deleted and it stops being scanned. The cluster itself is untouched.`,
                                    )
                                  ) {
                                    remove.mutate(c.name);
                                  }
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {remove.isError && (
        <p className="form__error">{(remove.error as Error)?.message ?? 'Removal failed'}</p>
      )}
    </>
  );
}

const EMPTY: ClusterRegistration = {
  name: '',
  server: '',
  bearerToken: '',
  caData: '',
  insecure: false,
};

function AddClusterForm({ onDone }: { onDone: () => void }) {
  const create = useCreateCluster();
  const [form, setForm] = useState<ClusterRegistration>(EMPTY);

  const set = <K extends keyof ClusterRegistration>(k: K, v: ClusterRegistration[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        ...form,
        // The server rejects a CA together with insecure rather than guessing
        // which one was meant, so send only the one that applies.
        caData: form.insecure ? undefined : form.caData,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <Card>
      <form onSubmit={submit}>
        <h2 className="settings__title" style={{ fontSize: 'var(--text-md)' }}>
          Add a cluster
        </h2>
        <p className="settings__desc" style={{ marginBottom: 'var(--space-4)' }}>
          Needs a read-only ServiceAccount token from the target cluster.{' '}
          <code>
            cluster-guardian cluster add {form.name || '<name>'} --remote-context &lt;ctx&gt;
          </code>{' '}
          provisions one and registers it in a single step, using your own kubeconfig — this form is
          for a token you already hold.
        </p>

        {create.isError && (
          <p className="form__error">
            {create.error instanceof ApiError
              ? create.error.message
              : String((create.error as Error)?.message ?? create.error)}
          </p>
        )}

        <label className="field">
          <span className="field__label">Name</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="prod-eu"
          />
          <span className="field__hint">How the cluster appears throughout the UI.</span>
        </label>

        <label className="field">
          <span className="field__label">API server</span>
          <input
            type="url"
            required
            value={form.server}
            onChange={(e) => set('server', e.target.value)}
            placeholder="https://prod-eu.example.com:6443"
          />
          <span className="field__hint">
            Must be reachable from inside this cluster, not just from your laptop.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Bearer token</span>
          <input
            type="password"
            required
            autoComplete="off"
            value={form.bearerToken}
            onChange={(e) => set('bearerToken', e.target.value)}
          />
          <span className="field__hint">
            Stored in a Secret in this namespace. Re-adding a cluster rotates it.
          </span>
        </label>

        <label className="field">
          <span className="field__label">CA certificate (base64)</span>
          <textarea
            value={form.caData}
            disabled={form.insecure}
            onChange={(e) => set('caData', e.target.value)}
            placeholder="LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t…"
          />
          <span className="field__hint">
            The <code>certificate-authority-data</code> field from the cluster's kubeconfig.
          </span>
        </label>

        <label className="field__row" style={{ marginBottom: 'var(--space-4)' }}>
          <input
            type="checkbox"
            checked={form.insecure}
            onChange={(e) => set('insecure', e.target.checked)}
          />
          Skip TLS verification
        </label>
        {form.insecure && (
          <p className="form__error">
            Without verification this instance cannot tell the real API server from anything that
            answers at that address — and it sends a credential on every scan.
          </p>
        )}

        <div className="form__buttons">
          <button type="submit" className="button button--primary" disabled={create.isPending}>
            {create.isPending ? 'Registering…' : 'Register cluster'}
          </button>
          <button type="button" className="button" onClick={onDone}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
