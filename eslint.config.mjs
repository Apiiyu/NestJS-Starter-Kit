import path from 'path';
import { fileURLToPath } from 'url';
import typescriptEslintParser from '@typescript-eslint/parser';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginSonarJS from 'eslint-plugin-sonarjs';
import eslintPluginSecurity from 'eslint-plugin-security';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: [
          path.resolve(__dirname, 'tsconfig.json'),
          path.resolve(__dirname, 'tsconfig.spec.json'),
        ],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaVersion: 2022,
      },
      globals: {
        global: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
      prettier: eslintPluginPrettier,
      import: eslintPluginImport,
      sonarjs: eslintPluginSonarJS,
      security: eslintPluginSecurity,
    },
    rules: {
      ...eslintConfigPrettier.rules,

      // ---- Prettier ----
      'prettier/prettier': 'error',

      // ---- TypeScript: previously disabled, now enforced ----
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // ---- TypeScript: async safety ----
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'off',

      // ---- TypeScript: modern idioms ----
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],

      // ---- TypeScript: naming conventions ----
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'class', format: ['PascalCase'] },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
      ],

      // ---- Import ordering ----
      // Temporarily disabled due to compatibility issue between ESLint v10
      // and eslint-plugin-import's import/order rule API usage.
      'import/order': 'off',
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',

      // ---- SonarJS ----
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/prefer-immediate-return': 'warn',

      // ---- Security ----
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-unsafe-regex': 'error',

      // ---- General ----
      'no-console': 'error',
      'constructor-super': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-cond-assign': ['error', 'always'],
      'no-constant-binary-expression': 'error',
      'no-extra-boolean-cast': 'error',
      'no-implied-eval': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-lonely-if': 'error',
      'no-loop-func': 'error',
      'no-multi-assign': 'error',
      'no-negated-condition': 'off',
      'no-nested-ternary': 'error',
      'no-new-wrappers': 'error',
      'no-param-reassign': 'error',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-undef': 'off',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-useless-catch': 'error',
      'no-use-before-define': 'error',
    },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      'sonarjs/no-duplicate-string': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.mjs', '*.js'],
  },
];
