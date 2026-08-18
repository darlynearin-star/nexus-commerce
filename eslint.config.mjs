import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.vercel/**', 'qa/**', '*.txt'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'warn',
      'no-constant-condition': 'warn',
      'no-prototype-builtins': 'warn',
      'no-case-declarations': 'warn',
      'no-extra-boolean-cast': 'warn',
      'prefer-const': 'warn',
      'no-async-promise-executor': 'warn',
      'no-control-regex': 'off',
      'no-useless-escape': 'warn',
      'no-empty-pattern': 'warn',
      'no-fallthrough': 'warn',
      'no-cond-assign': 'warn',
      'no-redeclare': 'warn',
      'no-self-assign': 'warn',
    },
  },
);