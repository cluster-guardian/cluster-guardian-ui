import { Outlet } from 'react-router';
import './settings.css';

/** Shared frame for the settings pages; the sidebar comes from the shell. */
export function SettingsLayout() {
  return <Outlet />;
}

export function SettingsHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="settings__head">
      <div>
        <h1 className="settings__title">{title}</h1>
        {description && <p className="settings__desc">{description}</p>}
      </div>
      {actions && <div className="settings__actions">{actions}</div>}
    </div>
  );
}

/**
 * Shown in place of a control the caller cannot use. Saying *why* matters:
 * "your role is viewer" and "this server has no write API" call for completely
 * different next steps, and a greyed-out button says neither.
 */
export function PermissionNotice({ reason }: { reason: string }) {
  return (
    <p className="settings__notice" role="note">
      <span aria-hidden="true">🔒</span> {reason}
    </p>
  );
}
