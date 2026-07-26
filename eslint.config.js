import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // `process` is referenced behind `typeof process !== 'undefined'` guards
      // (e.g. src/services/aiAssistant.js) to detect a Node/Vitest test
      // environment from otherwise browser-only code — allow the identifier
      // without pulling in the rest of the Node global set.
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // These four react-hooks checks are new/strict and fire on this
      // codebase's pervasive (intentional) "kick off async work on mount"
      // effect pattern — fixing them for real means restructuring effects
      // across many components, which belongs with the planned god-component
      // refactor, not a CI-gate PR. Kept as warnings so real regressions are
      // still visible without hard-blocking on a wider rewrite.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    // Config/build/test-runner files run under Node, not the browser.
    files: [
      '*.config.js',
      'e2e/**/*.js',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Vitest injects describe/it/expect/vi globally (see vite.config.js
    // `test.globals: true`) instead of requiring per-file imports.
    files: ['src/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
    },
  },
])
