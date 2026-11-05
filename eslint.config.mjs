import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'design/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    rules: { '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['tests/browser/*.js'],
    // Playwright CLI evaluates these files as standalone function expressions.
    rules: { '@typescript-eslint/no-unused-expressions': 'off' },
  },
);
