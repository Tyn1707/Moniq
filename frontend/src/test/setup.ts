import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount between tests so queries never match a previous render's DOM.
afterEach(() => {
  cleanup();
});
