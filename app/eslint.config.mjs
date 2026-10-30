// ESLint 9 (flat config): JS + TypeScript + pravidlá Next.js (vrátane Core Web Vitals) + React hooks.
// Spustenie: npm run lint   (v CI blokuje merge – US-18)
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts',
      '.lighthouseci/**', '.lighthouseci-mobile/**', 'playwright-report/**', 'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}', 'tests/**'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
