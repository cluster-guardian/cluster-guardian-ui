import { NavLink, useLocation } from 'react-router';
import { useServerMode } from '../../api/queries';
import { ThemeToggle } from '../ThemeToggle';
import { UserMenu } from './UserMenu';

/**
 * The bar across the top: product mark, the handful of top-level destinations,
 * and who you are. Deliberately short — a nav that lists everything is a nav
 * nobody reads.
 */
export function GlobalNav({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const mode = useServerMode();
  const { pathname } = useLocation();

  // In single-cluster mode there is no fleet to list, so the root *is* the
  // cluster and a "Clusters" entry would lead to the page you are on.
  const isFleet = mode.data === 'fleet';

  return (
    <header className="globalnav">
      {onToggleSidebar && (
        <button
          type="button"
          className="globalnav__burger"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
      )}

      <NavLink className="globalnav__brand" to="/">
        <ShieldMark />
        <span>Cluster Guardian</span>
      </NavLink>

      <nav className="globalnav__links" aria-label="Main">
        {isFleet && (
          <NavLink className="globalnav__link" to="/" end>
            Fleet
          </NavLink>
        )}
        <NavLink
          className="globalnav__link"
          to={isFleet ? '/issues' : '/issues'}
          // Cluster-scoped issue pages live under /clusters/{name}/issues and
          // should light this up too.
          aria-current={pathname.endsWith('/issues') ? 'page' : undefined}
        >
          Issues
        </NavLink>
        {/* Always reachable: Preferences and Access need no write API and no
            role, and Access is where a caller finds out *why* something else
            is unavailable. */}
        <NavLink
          className="globalnav__link"
          to="/settings"
          aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
        >
          Settings
        </NavLink>
      </nav>

      <div className="globalnav__actions">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

function ShieldMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2.5 20 5.5v6.2c0 5-3.4 9.3-8 10.8-4.6-1.5-8-5.8-8-10.8V5.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m8.4 12.2 2.6 2.6 4.6-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
