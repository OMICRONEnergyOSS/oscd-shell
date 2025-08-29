import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginTSDoc from 'eslint-plugin-tsdoc';
import openWcConfig from '@open-wc/eslint-config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...openWcConfig,
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ),
  {
    ignores: [
      'dist/',
      'node_modules',
      'coverage',
      'doc',
      'locales.ts',
      'locales/',
    ],
  },

  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'eslint-plugin-tsdoc': eslintPluginTSDoc,
    },

    languageOptions: {
      parser: tsParser,
    },

    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-use-before-define': 'off',
      'class-methods-use-this': [
        'error',
        {
          exceptMethods: ['locale'],
        },
      ],
      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          ignoreRestArgs: true,
        },
      ],
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.ts',
            '**/*.spec.ts',
            'eslint.config.js',
            'rollup.config.js',
            'web-test-runner.config.js',
            'web-dev-server.*',
          ],
        },
      ],
      'import-x/no-unresolved': 'off',
      'import-x/extensions': [
        'error',
        'always',
        {
          ignorePackages: true,
        },
      ],
    },
  },
  eslintPluginPrettierRecommended,
  {
    rules: {
      curly: ['error', 'all'],
    },
  },
  {
    files: ['*.test.ts', '*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];
