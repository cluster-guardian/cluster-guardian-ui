import { describe, expect, it } from 'vitest';
import {
  computeFacets,
  countActiveFilters,
  emptyIssueFilters,
  filterIssues,
  toIssues,
  toggle,
  type IssueFilters,
} from './issues';
import { makeReport } from '../test/fixtures';
import type { Severity } from '../api/types';

const issues = () => toIssues(makeReport());
const filters = (over: Partial<IssueFilters> = {}): IssueFilters => ({
  ...emptyIssueFilters(),
  ...over,
});

describe('toIssues', () => {
  it('flattens namespaces and sections into one list', () => {
    expect(issues()).toHaveLength(5);
  });

  it('sorts worst first across group boundaries', () => {
    // The critical in "shop" and the critical in "Security" must both outrank
    // the warning in "payments", even though payments comes first in the report.
    expect(issues().map((i) => i.severity)).toEqual([
      'critical',
      'critical',
      'warning',
      'info',
      'ok',
    ]);
  });

  it('records where each issue came from', () => {
    const shop = issues().find((i) => i.location === 'shop');
    expect(shop).toMatchObject({ scope: 'namespace', area: 'workloads', team: 'shop-team' });
    const security = issues().find((i) => i.location === 'Security');
    expect(security).toMatchObject({ scope: 'section', area: 'security' });
  });

  it('gives every issue a distinct key even for repeated messages', () => {
    const r = makeReport();
    r.sections = [
      {
        id: 'security',
        title: 'Security',
        icon: '🔒',
        findings: [
          { severity: 'warning', message: 'same message' },
          { severity: 'warning', message: 'same message' },
        ],
      },
    ];
    const keys = toIssues(r).map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('tolerates the null slices Go emits', () => {
    expect(toIssues(makeReport({ namespaces: null, sections: null }))).toEqual([]);
  });
});

describe('filterIssues', () => {
  it('excludes OK findings by default', () => {
    expect(filterIssues(issues(), filters())).toHaveLength(4);
  });

  it('treats an empty facet set as no constraint', () => {
    expect(filterIssues(issues(), filters({ areas: new Set() }))).toHaveLength(4);
  });

  it('narrows by area', () => {
    const out = filterIssues(issues(), filters({ areas: new Set(['security']) }));
    expect(out).toHaveLength(1);
    expect(out[0].location).toBe('Security');
  });

  it('narrows by namespace, excluding cluster-wide sections', () => {
    const out = filterIssues(issues(), filters({ namespaces: new Set(['shop']) }));
    expect(out.map((i) => i.location)).toEqual(['shop']);
  });

  it('narrows by team', () => {
    const out = filterIssues(issues(), filters({ teams: new Set(['payments-team']) }));
    expect(out.every((i) => i.team === 'payments-team')).toBe(true);
  });

  it('combines facets as AND', () => {
    const out = filterIssues(
      issues(),
      filters({ namespaces: new Set(['shop']), severities: new Set<Severity>(['info']) }),
    );
    expect(out).toHaveLength(0);
  });

  it('filters to compliance-mapped findings only', () => {
    const out = filterIssues(issues(), filters({ onlyCompliance: true }));
    expect(out).toHaveLength(1);
    expect(out[0].controls).toContain('PSS/restricted:runAsNonRoot');
  });

  it('searches message, location, object, hint and controls', () => {
    expect(filterIssues(issues(), filters({ query: 'deployment/web' }))).toHaveLength(1);
    expect(filterIssues(issues(), filters({ query: 'Security' }))).toHaveLength(1);
    expect(filterIssues(issues(), filters({ query: 'runAsNonRoot' }))).toHaveLength(1);
  });

  it('clearing every severity yields nothing', () => {
    expect(filterIssues(issues(), filters({ severities: new Set() }))).toHaveLength(0);
  });
});

describe('computeFacets', () => {
  it('counts each facet against the other facets, not the whole report', () => {
    // Narrowed to the shop namespace, the security area must not still claim
    // its cluster-wide finding — clicking it would produce nothing.
    const f = computeFacets(issues(), filters({ namespaces: new Set(['shop']) }));
    expect(f.areas.find((a) => a.value === 'security')).toBeUndefined();
  });

  it('leaves severity counts unaffected by the severity selection', () => {
    // Turning Info off must not make Info's own count disappear, or it could
    // never be turned back on.
    const f = computeFacets(issues(), filters({ severities: new Set<Severity>(['critical']) }));
    expect(f.severities.find((s) => s.value === 'info')?.count).toBe(1);
  });

  it('orders facets by count, then name', () => {
    const f = computeFacets(issues(), filters());
    const counts = f.areas.map((a) => a.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('never offers a facet value that would yield zero results', () => {
    const f = computeFacets(issues(), filters({ severities: new Set<Severity>(['critical']) }));
    for (const area of f.areas) {
      const out = filterIssues(
        issues(),
        filters({ severities: new Set<Severity>(['critical']), areas: new Set([area.value]) }),
      );
      expect(out.length).toBe(area.count);
    }
  });
});

describe('toggle', () => {
  it('adds and removes without mutating the original', () => {
    const a = new Set(['x']);
    const b = toggle(a, 'y');
    expect([...a]).toEqual(['x']);
    expect([...b].sort()).toEqual(['x', 'y']);
    expect([...toggle(b, 'x')]).toEqual(['y']);
  });
});

describe('countActiveFilters', () => {
  it('ignores severity, which always has a selection', () => {
    expect(countActiveFilters(filters())).toBe(0);
    expect(countActiveFilters(filters({ areas: new Set(['a']), query: 'x' }))).toBe(2);
  });
});
