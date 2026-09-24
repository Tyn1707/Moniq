import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Recharts' `ResponsiveContainer` measures its parent with a ResizeObserver, which
 * jsdom does not implement. A no-op stub is enough: the container falls back to its
 * default size, and none of these tests assert on rendered chart geometry.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

/**
 * jsdom has no layout engine, so a ResponsiveContainer always measures 0×0 and
 * Recharts warns about it on every chart render. Filter that one message — and
 * only that one — so genuine warnings stay visible in test output.
 */
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('The width(0) and height(0) of chart')) return;
  originalWarn(...args);
};

// Unmount between tests so queries never match a previous render's DOM.
afterEach(() => {
  cleanup();
});
