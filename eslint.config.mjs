import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Apostrophes in JSX copy are fine; React escapes text content.
      'react/no-unescaped-entities': 'off',
      // TODO(phase 2, stage D): these flag the useEffect-fetch pattern that moves to server components.
      'react-hooks/set-state-in-effect': 'warn',
      // Chart.js callback params and a few Prisma update builders are typed loosely for now.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // One-off Node maintenance scripts are CommonJS.
    files: ['scripts/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Static Westmount draft app + its node:test suites are plain browser/CommonJS scripts.
    'public/**',
    'tests/**',
  ]),
])
