import { describe, expect, it } from 'vitest';
import {
  defaultFilterState,
  filterReport,
  namespaceOptions,
  teamOptions,
  type FilterState,
} from './filter';
import { makeReport } from '../test/fixtures';

const base = (over: Partial<FilterState> = {}): FilterState => ({
  ...defaultFilterState(),
  ...over,
});

describe('filterReport', () => {
  it('counts every finding as total, regardless of the filter', () => {
    const { total } = filterReport(makeReport(), base({ severities: new Set(['critical']) }));
    expect(total).toBe(5);
  });

  it('keeps only the selected severities', () => {
    const out = filterReport(makeReport(), base({ severities: new Set(['critical']) }));
    expect(out.matches).toBe(2);
    expect(out.namespaces.map((n) => n.name)).toEqual(['shop']);
    expect(out.sections.map((s) => s.id)).toEqual(['security']);
  });

  it('drops groups that filter down to nothing rather than rendering them empty', () => {
    const out = filterReport(makeReport(), base({ severities: new Set(['ok']) }));
    expect(out.namespaces).toHaveLength(0);
    expect(out.sections).toHaveLength(1);
  });

  it('searches message, object, hint and controls', () => {
    const r = makeReport();
    expect(filterReport(r, base({ query: 'deployment/web' })).matches).toBe(1);
    expect(filterReport(r, base({ query: 'Set requests' })).matches).toBe(1);
    expect(
      filterReport(r, base({ severities: new Set(['critical']), query: 'runAsNonRoot' })).matches,
    ).toBe(1);
  });

  it('search is case-insensitive', () => {
    expect(filterReport(makeReport(), base({ query: 'LATEST' })).matches).toBe(1);
  });

  it('hides cluster-wide sections once narrowed to a namespace', () => {
    const out = filterReport(makeReport(), base({ namespace: 'shop' }));
    expect(out.sections).toHaveLength(0);
    expect(out.namespaces.map((n) => n.name)).toEqual(['shop']);
  });

  it('hides cluster-wide sections once narrowed to a team', () => {
    const out = filterReport(makeReport(), base({ team: 'payments-team' }));
    expect(out.sections).toHaveLength(0);
    expect(out.namespaces.map((n) => n.name)).toEqual(['payments']);
  });

  it('yields an empty view when no severity is selected', () => {
    const out = filterReport(makeReport(), base({ severities: new Set() }));
    expect(out.matches).toBe(0);
    expect(out.total).toBe(5);
  });

  it('tolerates the null slices Go emits for empty lists', () => {
    const out = filterReport(makeReport({ namespaces: null, sections: null }), base());
    expect(out).toMatchObject({ matches: 0, total: 0, namespaces: [], sections: [] });
  });
});

describe('option lists', () => {
  it('sorts namespaces', () => {
    expect(namespaceOptions(makeReport())).toEqual(['payments', 'shop']);
  });

  it('returns distinct sorted teams', () => {
    expect(teamOptions(makeReport())).toEqual(['payments-team', 'shop-team']);
  });

  it('omits namespaces with no team', () => {
    const r = makeReport();
    r.namespaces = [{ name: 'a', findings: [] }];
    expect(teamOptions(r)).toEqual([]);
  });
});
