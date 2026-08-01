import { useSession } from '../../api/session-context';
import { PERMISSIONS, type Permission } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { SettingsHeader } from './SettingsLayout';

const PERMISSION_LABEL: Record<Permission, string> = {
  'reports:read': 'Read reports, history and team ownership',
  'teams:write': 'Edit team ownership',
  'clusters:write': 'Register and remove clusters',
};

/**
 * What this session can do and why. Roles are configured on the server with
 * flags, not here — this page explains the outcome rather than pretending to
 * be an editor for something the UI cannot change.
 */
export function AccessSettings() {
  const { identity, features } = useSession();

  return (
    <>
      <SettingsHeader
        title="Access"
        description="Your identity, role and permissions. Roles are configured on the server: identity comes from the authenticating proxy in front of cluster-guardian, and groups map to roles with --auth-group-role."
      />

      <Card>
        <dl className="access__grid">
          <div className="access__item">
            <dt>Signed in as</dt>
            <dd>{identity.anonymous ? 'Anonymous' : identity.user}</dd>
          </div>
          <div className="access__item">
            <dt>Role</dt>
            <dd>{identity.role}</dd>
          </div>
          <div className="access__item">
            <dt>Groups</dt>
            <dd>
              {identity.groups?.length ? (
                <div className="chips-inline">
                  {identity.groups.map((g) => (
                    <span className="badge badge--neutral" key={g}>
                      {g}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="muted">none</span>
              )}
            </dd>
          </div>
        </dl>

        {identity.anonymous && (
          <p className="settings__notice">
            <span aria-hidden="true">🔒</span>
            This request carries no identity. Either the server runs without{' '}
            <code>--auth-mode=proxy</code>, or the proxy in front of it did not set the identity
            headers. Anonymous callers get the role from <code>--auth-anonymous-role</code>.
          </p>
        )}

        <h2 className="settings__title" style={{ fontSize: 'var(--text-md)' }}>
          Permissions
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Permission</th>
                <th scope="col">Allows</th>
                <th scope="col">Your access</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => {
                const held = identity.permissions?.includes(p) ?? false;
                // Holding the permission is not enough — the deployment must
                // also serve the route.
                const supported =
                  p === 'clusters:write'
                    ? features.clusters
                    : p === 'teams:write'
                      ? features.teams
                      : true;
                return (
                  <tr key={p}>
                    <th scope="row" className="mono">
                      {p}
                    </th>
                    <td>{PERMISSION_LABEL[p]}</td>
                    <td>
                      {!supported ? (
                        <span className="badge badge--neutral">Not enabled on this server</span>
                      ) : held ? (
                        <span className="badge badge--ok">
                          <span className="badge__icon" aria-hidden="true">
                            ✓
                          </span>
                          Allowed
                        </span>
                      ) : (
                        <span className="badge badge--neutral">Denied</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
