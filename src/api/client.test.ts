import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  detectMode,
  downloadUrl,
  fetchClusters,
  fetchReport,
  reportBase,
} from './client';

function mockFetch(handler: (url: string) => { status: number; body: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const { status, body } = handler(String(input));
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => String(body),
      } as Response;
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('reportBase', () => {
  it('uses the fleet path only when a cluster is named', () => {
    expect(reportBase(null)).toBe('/api');
    expect(reportBase('prod')).toBe('/api/clusters/prod');
    expect(reportBase('eu/west')).toBe('/api/clusters/eu%2Fwest');
  });
});

describe('fetchReport', () => {
  it('sends ?refresh=true only in single-cluster mode', async () => {
    const seen: string[] = [];
    mockFetch((url) => {
      seen.push(url);
      return { status: 200, body: {} };
    });
    await fetchReport(null, { refresh: true });
    await fetchReport('prod', { refresh: true });
    expect(seen).toEqual(['/api/report?refresh=true', '/api/clusters/prod/report']);
  });

  it('raises ApiError carrying the status and the plain-text body', async () => {
    mockFetch(() => ({ status: 502, body: 'analysis failed: no such host' }));
    await expect(fetchReport(null)).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      message: 'analysis failed: no such host',
    });
  });
});

describe('fetchClusters', () => {
  it('normalizes the null slice Go emits for an empty fleet', async () => {
    mockFetch(() => ({ status: 200, body: { clusters: null } }));
    expect(await fetchClusters()).toEqual([]);
  });
});

describe('detectMode', () => {
  it('reads a served /api/clusters as fleet mode', async () => {
    mockFetch(() => ({ status: 200, body: { clusters: [] } }));
    expect(await detectMode()).toBe('fleet');
  });

  it('reads a 404 on /api/clusters as single-cluster mode', async () => {
    mockFetch(() => ({ status: 404, body: '404 page not found' }));
    expect(await detectMode()).toBe('single');
  });

  it('does not mistake a server error for single-cluster mode', async () => {
    mockFetch(() => ({ status: 500, body: 'boom' }));
    await expect(detectMode()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('downloadUrl', () => {
  it('points at the right report route per mode and format', () => {
    expect(downloadUrl(null, 'json')).toBe('/api/report');
    expect(downloadUrl(null, 'markdown')).toBe('/api/report/markdown');
    expect(downloadUrl('prod', 'markdown')).toBe('/api/clusters/prod/report/markdown');
  });
});
