import { describe, expect, it } from 'vitest';
import { formatDuration, formatRelative, formatTimestamp, plural } from './format';
import { gradeOf } from './grade';

describe('formatRelative', () => {
  const now = new Date('2026-07-26T12:00:00Z');

  it('collapses the last few seconds', () => {
    expect(formatRelative('2026-07-26T11:59:57Z', now)).toBe('just now');
  });

  it('reports minutes and hours back', () => {
    expect(formatRelative('2026-07-26T11:45:00Z', now)).toMatch(/15 minutes ago/);
    expect(formatRelative('2026-07-26T09:00:00Z', now)).toMatch(/3 hours ago/);
  });

  it('returns a dash for an unparseable timestamp', () => {
    expect(formatRelative('not-a-time', now)).toBe('—');
    expect(formatTimestamp('')).toBe('—');
  });
});

describe('formatDuration', () => {
  it('switches units at 1s and 60s', () => {
    expect(formatDuration(0.42)).toBe('420 ms');
    expect(formatDuration(2.35)).toBe('2.4 s');
    expect(formatDuration(95)).toBe('1 m 35 s');
  });

  it('handles an absent duration', () => {
    expect(formatDuration(undefined)).toBe('—');
  });
});

describe('plural', () => {
  it('picks the singular only at exactly one', () => {
    expect(plural(1, 'Pod')).toBe('1 Pod');
    expect(plural(0, 'Pod')).toBe('0 Pods');
    expect(plural(2, 'Pod')).toBe('2 Pods');
  });
});

describe('gradeOf', () => {
  it('uses the same thresholds as report.GradeOf', () => {
    expect(gradeOf(100)).toBe('A');
    expect(gradeOf(90)).toBe('A');
    expect(gradeOf(89)).toBe('B');
    expect(gradeOf(80)).toBe('B');
    expect(gradeOf(70)).toBe('C');
    expect(gradeOf(60)).toBe('D');
    expect(gradeOf(59)).toBe('F');
    expect(gradeOf(0)).toBe('F');
  });
});
