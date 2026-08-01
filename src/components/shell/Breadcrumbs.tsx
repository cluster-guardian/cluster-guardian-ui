import { Link } from 'react-router';

export interface Crumb {
  label: string;
  /** Omit on the last crumb — you are already there. */
  to?: string;
}

/** The path to the current page, in the SecurityScorecard idiom. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <ol className="crumbs">
      {items.map((c, i) => (
        <li className="crumbs__item" key={`${c.label}-${i}`}>
          {c.to && i < items.length - 1 ? (
            <Link to={c.to}>{c.label}</Link>
          ) : (
            <span aria-current="page">{c.label}</span>
          )}
          {i < items.length - 1 && (
            <span className="crumbs__sep" aria-hidden="true">
              ›
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
