import '@testing-library/jest-dom/vitest';

// Recharts' ResponsiveContainer measures its parent, which jsdom always reports
// as 0x0 — without this the chart renders nothing and its tests assert on an
// empty tree.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
