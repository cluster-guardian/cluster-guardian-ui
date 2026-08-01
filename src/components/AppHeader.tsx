import { Link } from 'react-router';
import { ThemeToggle } from './ThemeToggle';
import './AppHeader.css';

interface AppHeaderProps {
  /** Auto-refresh is off by default: a refresh in single-cluster mode can
   *  trigger a real analysis against the API server. */
  autoRefresh: boolean;
  onToggleAutoRefresh: (next: boolean) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function AppHeader({
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
  refreshing,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link className="app-header__brand" to="/">
          <ShieldMark />
          <span>Cluster Guardian</span>
        </Link>

        <div className="app-header__actions">
          <label className="app-header__switch">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onToggleAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          {onRefresh && (
            <button type="button" className="button" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function ShieldMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
