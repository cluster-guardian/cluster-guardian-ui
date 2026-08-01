import type { Severity } from '../../api/types';
import { SEVERITY_ICON, SEVERITY_LABEL } from '../../lib/severity';
import { toggle, type Facet, type IssueFacets, type IssueFilters } from '../../lib/issues';

interface FilterRailProps {
  facets: IssueFacets;
  filters: IssueFilters;
  onChange: (next: IssueFilters) => void;
  onReset: () => void;
  activeCount: number;
}

/**
 * The faceted rail down the left of the Issues page. Every value carries its
 * result count, computed against the other facets — so a count is a promise
 * about what clicking will produce, never a number that leads to an empty list.
 */
export function FilterRail({ facets, filters, onChange, onReset, activeCount }: FilterRailProps) {
  return (
    <div className="rail">
      <div className="rail__head">
        <h2 className="rail__heading">Filters</h2>
        {activeCount > 0 && (
          <button type="button" className="rail__clear" onClick={onReset}>
            Clear ({activeCount})
          </button>
        )}
      </div>

      <label className="rail__search">
        <span className="visually-hidden">Search issues</span>
        <input
          type="search"
          placeholder="Search issues…"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
        />
      </label>

      <FacetGroup title="Severity">
        <ul className="rail__list">
          {facets.severities.map((f) => {
            const value = f.value as Severity;
            const active = filters.severities.has(value);
            return (
              <li key={value}>
                <button
                  type="button"
                  className="rail__option"
                  aria-pressed={active}
                  onClick={() =>
                    onChange({ ...filters, severities: toggle(filters.severities, value) })
                  }
                >
                  <span
                    className={`rail__check ${active ? 'rail__check--on' : ''}`}
                    aria-hidden="true"
                  >
                    {active ? '✓' : ''}
                  </span>
                  <span className={`rail__sev rail__sev--${value}`} aria-hidden="true">
                    {SEVERITY_ICON[value]}
                  </span>
                  <span className="rail__label">{SEVERITY_LABEL[value]}</span>
                  <span className="rail__count tabular">{f.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </FacetGroup>

      <SetFacet
        title="Area"
        facets={facets.areas}
        selected={filters.areas}
        onToggle={(v) => onChange({ ...filters, areas: toggle(filters.areas, v) })}
      />
      <SetFacet
        title="Namespace"
        facets={facets.namespaces}
        selected={filters.namespaces}
        onToggle={(v) => onChange({ ...filters, namespaces: toggle(filters.namespaces, v) })}
      />
      <SetFacet
        title="Team"
        facets={facets.teams}
        selected={filters.teams}
        onToggle={(v) => onChange({ ...filters, teams: toggle(filters.teams, v) })}
      />

      <FacetGroup title="Compliance">
        <label className="rail__switch">
          <input
            type="checkbox"
            checked={filters.onlyCompliance}
            onChange={(e) => onChange({ ...filters, onlyCompliance: e.target.checked })}
          />
          Mapped to a control only
        </label>
      </FacetGroup>
    </div>
  );
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rail__group">
      <h3 className="rail__group-title">{title}</h3>
      {children}
    </section>
  );
}

/**
 * A facet with no values is omitted entirely rather than rendered empty — an
 * empty "Team" heading on a cluster with no team mapping is noise.
 */
function SetFacet({
  title,
  facets,
  selected,
  onToggle,
}: {
  title: string;
  facets: Facet[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (facets.length === 0) return null;

  return (
    <FacetGroup title={title}>
      <ul className="rail__list">
        {facets.map((f) => {
          const active = selected.has(f.value);
          return (
            <li key={f.value}>
              <button
                type="button"
                className="rail__option"
                aria-pressed={active}
                onClick={() => onToggle(f.value)}
              >
                <span
                  className={`rail__check ${active ? 'rail__check--on' : ''}`}
                  aria-hidden="true"
                >
                  {active ? '✓' : ''}
                </span>
                <span className="rail__label">{f.label}</span>
                <span className="rail__count tabular">{f.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </FacetGroup>
  );
}
