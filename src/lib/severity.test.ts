import { describe, expect, it } from 'vitest';
import type { Severity } from '../api/types';
import { compareSeverity, countBySeverity, maxSeverity, rank } from './severity';

describe('severity ordering', () => {
  it('matches the Go iota order', () => {
    expect(rank('ok')).toBeLessThan(rank('info'));
    expect(rank('info')).toBeLessThan(rank('warning'));
    expect(rank('warning')).toBeLessThan(rank('critical'));
  });

  it('sorts worst first', () => {
    const unsorted: Severity[] = ['info', 'critical', 'ok', 'warning'];
    expect(unsorted.sort(compareSeverity)).toEqual(['critical', 'warning', 'info', 'ok']);
  });
});

describe('maxSeverity', () => {
  it('returns the highest present', () => {
    expect(
      maxSeverity([
        { severity: 'info', message: 'a' },
        { severity: 'critical', message: 'b' },
        { severity: 'warning', message: 'c' },
      ]),
    ).toBe('critical');
  });

  it('defaults to ok for empty and null', () => {
    expect(maxSeverity([])).toBe('ok');
    expect(maxSeverity(null)).toBe('ok');
  });
});

describe('countBySeverity', () => {
  it('counts each level and the total', () => {
    expect(
      countBySeverity([
        { severity: 'critical', message: 'a' },
        { severity: 'critical', message: 'b' },
        { severity: 'ok', message: 'c' },
      ]),
    ).toEqual({ critical: 2, warning: 0, info: 0, ok: 1, total: 3 });
  });
});
