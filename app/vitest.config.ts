// Vitest – unit testy knižníc (src/**/*.test.ts). E2E sú v tests/ (Playwright), preto ich vylučujeme.
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
