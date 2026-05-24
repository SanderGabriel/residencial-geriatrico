import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const includeIntegration = process.env.INTEGRATION !== '0';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    testTimeout: 30_000,
    fileParallelism: !includeIntegration,
    environment: 'node',
    environmentMatchGlobs: [
      ['client/**', 'jsdom'],
    ],
    setupFiles: ['./client/src/test-setup.ts'],
    include: [
      'server/**/*.test.ts',
      'shared/**/*.test.ts',
      'client/src/**/*.test.{ts,tsx}',
      ...(includeIntegration ? ['server/**/*.int.test.ts'] : []),
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'server/**/*.ts',
        'shared/**/*.ts',
        'drizzle/**/*.ts',
        'client/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__test__/**',
        '**/_core/index.ts',
        'drizzle/migrations/**',
        'client/src/test-setup.ts',
        'client/src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@server': path.resolve(__dirname, 'server'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@drizzle': path.resolve(__dirname, 'drizzle'),
    },
  },
});
