import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPreferences,
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
} from './preferences';

beforeEach(() => localStorage.clear());

describe('loadPreferences', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('merges a blob written by an older version over the defaults', () => {
    // No `density` key — added after this blob was written.
    localStorage.setItem('cg-preferences', JSON.stringify({ autoRefresh: true }));
    const p = loadPreferences();
    expect(p.autoRefresh).toBe(true);
    expect(p.density).toBe(DEFAULT_PREFERENCES.density);
  });

  it('falls back rather than throwing on a corrupt blob', () => {
    localStorage.setItem('cg-preferences', '{not json');
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('clamps a poll interval that would hammer the server', () => {
    localStorage.setItem('cg-preferences', JSON.stringify({ refreshSeconds: 1 }));
    expect(loadPreferences().refreshSeconds).toBe(10);
    localStorage.setItem('cg-preferences', JSON.stringify({ refreshSeconds: 99999 }));
    expect(loadPreferences().refreshSeconds).toBe(600);
  });

  it('drops severity values that are not severities', () => {
    localStorage.setItem(
      'cg-preferences',
      JSON.stringify({ defaultSeverities: ['critical', 'bogus'] }),
    );
    expect(loadPreferences().defaultSeverities).toEqual(['critical']);
  });

  it('rejects an out-of-range enum', () => {
    localStorage.setItem('cg-preferences', JSON.stringify({ landing: 'nowhere', density: 'huge' }));
    const p = loadPreferences();
    expect(p.landing).toBe('fleet');
    expect(p.density).toBe('comfortable');
  });
});

describe('savePreferences', () => {
  it('round-trips', () => {
    savePreferences({ ...DEFAULT_PREFERENCES, density: 'compact', refreshSeconds: 60 });
    expect(loadPreferences()).toMatchObject({ density: 'compact', refreshSeconds: 60 });
  });

  it('survives a storage that refuses to write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => savePreferences(DEFAULT_PREFERENCES)).not.toThrow();
    spy.mockRestore();
  });
});

describe('clearPreferences', () => {
  it('restores the defaults', () => {
    savePreferences({ ...DEFAULT_PREFERENCES, density: 'compact' });
    clearPreferences();
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});
