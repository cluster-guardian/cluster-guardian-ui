import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

export interface SidebarItem {
  label: string;
  to: string;
  /** Match only the exact path — for a section's own index route. */
  end?: boolean;
  /** A count beside the label, e.g. open criticals. */
  badge?: number | string;
  /** Tints the badge; omit for a neutral count. */
  badgeTone?: 'critical' | 'warning' | 'info';
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
  /**
   * Shown only on narrow viewports, where the global nav collapses. Without
   * this the top-level destinations become unreachable on a phone — the burger
   * opens the contextual sidebar, not the global bar.
   */
  mobileOnly?: boolean;
}

interface SidebarProps {
  sections: SidebarSection[];
  header?: ReactNode;
  open: boolean;
  onNavigate: () => void;
}

/**
 * Contextual navigation for whatever the page is about — the cluster, or
 * settings. Grouped with headings rather than one flat list, because a flat
 * list of a dozen entries reads as noise.
 */
export function Sidebar({ sections, header, open, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`.trim()}>
      {header && <div className="sidebar__header">{header}</div>}

      {sections.map((section, i) => (
        <div
          className={`sidebar__section ${section.mobileOnly ? 'sidebar__section--mobile' : ''}`.trim()}
          key={section.title ?? i}
        >
          {section.title && <p className="sidebar__title">{section.title}</p>}
          <ul>
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`.trim()
                  }
                  onClick={onNavigate}
                >
                  {item.label}
                  {item.badge !== undefined && item.badge !== 0 && (
                    <span
                      className={`sidebar__badge ${
                        item.badgeTone ? `sidebar__badge--${item.badgeTone}` : ''
                      }`.trim()}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
