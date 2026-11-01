import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    include: ['tests/identity/**/*.test.ts', 'tests/directory/**/*.test.ts'],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 10000,
    hookTimeout: 20000,
  },
});
