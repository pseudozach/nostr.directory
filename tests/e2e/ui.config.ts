import { defineConfig } from 'vitest/config';

// Isolated UI harness: Next's production tsconfig intentionally preserves JSX.
export default defineConfig({
  oxc: { jsx: { runtime: 'classic' } },
  test: {
    include: ['tests/identity/ui*.test.ts'],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
