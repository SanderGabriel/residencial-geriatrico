import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/**/*.ts', 'shared/**/*.ts', 'drizzle/**/*.ts'],
      exclude: ['**/*.test.ts', '**/_core/index.ts', 'drizzle/migrations/**'],
    },
  },
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, 'server'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@drizzle': path.resolve(__dirname, 'drizzle'),
    },
  },
});
