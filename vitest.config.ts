import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['tests/**/*.test.tsx', 'jsdom']],
    setupFiles: ['tests/setup.ts'],
  },
});
