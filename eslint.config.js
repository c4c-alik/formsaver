// @ts-check

import js from '@eslint/js';
import tsPlugin from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import pluginPreprocessor from 'eslint-plugin-prettier/recommended';

export default tsPlugin.config(
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  prettierConfig,
  pluginPreprocessor,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
      },
    },
    rules: {
      // 'indent': ['error', 2],  // Disabled due to conflict with Prettier
      // 'linebreak-style': ['error', 'unix'],  // Disabled due to conflict with Prettier
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
    files: ['src/**/*.ts'],
    ignores: ['dist/**', 'node_modules/**', '*.json'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  }
);
