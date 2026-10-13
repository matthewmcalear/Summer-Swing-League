import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
    // *.db.test.ts need a throwaway Postgres (see lib/polydan/markets.db.test.ts);
    // they run only with DB_TESTS=1.
    exclude: ['**/node_modules/**', ...(process.env.DB_TESTS ? [] : ['**/*.db.test.ts'])],
  },
})
