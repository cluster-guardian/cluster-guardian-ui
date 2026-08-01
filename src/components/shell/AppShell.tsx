import { useState, type ReactNode } from 'react';
import { GlobalNav } from './GlobalNav';
import { Sidebar, type SidebarSection } from './Sidebar';
import './shell.css';

interface AppShellProps {
  /** Contextual navigation for whatever the page is about. Omit for full-width pages. */
  sidebar?: SidebarSection[];
  /** Rendered above the sidebar — the score badge on a cluster, say. */
  sidebarHeader?: ReactNode;
  breadcrumbs?: ReactNode;
  children: ReactNode;
}

/**
 * The frame every page sits in: a global bar across the top, a contextual
 * sidebar down the left, content in the middle. The layout is the app's
 * structure made visible — where you are and what else is here are answerable
 * without navigating.
 */
export function AppShell({ sidebar, sidebarHeader, breadcrumbs, children }: AppShellProps) {
  // Below 960px the sidebar becomes a drawer rather than shrinking the content
  // to nothing.
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="shell">
      <GlobalNav onToggleSidebar={sidebar ? () => setDrawerOpen((v) => !v) : undefined} />

      <div className={`shell__body ${sidebar ? '' : 'shell__body--wide'}`}>
        {sidebar && (
          <>
            <Sidebar
              sections={sidebar}
              header={sidebarHeader}
              open={drawerOpen}
              onNavigate={() => setDrawerOpen(false)}
            />
            {/* Tapping outside closes the drawer; inert on desktop. */}
            {drawerOpen && (
              <button
                type="button"
                className="shell__scrim"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
              />
            )}
          </>
        )}

        <main className="shell__main">
          {breadcrumbs && <nav aria-label="Breadcrumb">{breadcrumbs}</nav>}
          {children}
        </main>
      </div>
    </div>
  );
}
