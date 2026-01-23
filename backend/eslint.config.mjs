// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn'
    },
  },
  {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: 'tsconfig.json',
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    overrides: [
      {
        files: ['test/**'],
        plugins: ['jest'],
        rules: {
          // you should turn the original rule off *only* for test files
          '@typescript-eslint/unbound-method': 'off',
          'jest/unbound-method': 'error',
        },
      },
    ],
    rules: {
      '@typescript-eslint/unbound-method': 'error',
    },
  }
);