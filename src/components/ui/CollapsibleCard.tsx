import type { ReactNode } from 'react';

interface CollapsibleCardProps {
  title: string;
  /** Emoji or glyph shown before the title. */
  icon?: ReactNode;
  /** Badges shown on the right of the header, readable while collapsed. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A card that folds. Built on <details> so open/closed state, keyboard
 * handling and browser find-in-page come from the platform rather than from
 * state we maintain.
 *
 * The header keeps its summary badges visible while collapsed — a section that
 * hides how bad it is until you open it is not worth collapsing.
 */
export function CollapsibleCard({
  title,
  icon,
  summary,
  defaultOpen = true,
  children,
}: CollapsibleCardProps) {
  return (
    <details className="collapsible card" open={defaultOpen}>
      <summary className="collapsible__summary">
        {icon && (
          <span className="collapsible__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 className="collapsible__title">{title}</h2>
        {summary && <span className="collapsible__badges">{summary}</span>}
        <span className="collapsible__chevron" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="collapsible__body">{children}</div>
    </details>
  );
}
