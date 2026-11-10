import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import boundaries from 'eslint-plugin-boundaries';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

// Aturan layering: docs/architecture/struktur-kode.md → Aturan Layering.
// Urutan elemen penting: pola pertama yang cocok menentukan tipe file.
const elements = [
  { type: 'sw', mode: 'file', pattern: 'src/app/sw.ts' },
  { type: 'api', pattern: 'src/app/api' },
  { type: 'app', pattern: 'src/app' },
  { type: 'middleware', mode: 'file', pattern: 'src/middleware.ts' },
  { type: 'server', pattern: 'src/server' },
  { type: 'shared', pattern: 'src/shared' },
  { type: 'client-offline', pattern: 'src/client/offline' },
  { type: 'client', pattern: 'src/client' },
  { type: 'components', pattern: 'src/components' },
];

const layering = [
  { from: 'api', allow: ['shared', 'server', 'api'] },
  { from: 'app', allow: ['shared', 'server', 'components', 'app'] },
  { from: 'middleware', allow: ['shared', 'server'] },
  { from: 'sw', allow: ['shared', 'client-offline'] },
  { from: 'server', allow: ['shared', 'server'] },
  { from: 'shared', allow: ['shared'] },
  { from: 'client-offline', allow: ['shared', 'client-offline', 'client'] },
  { from: 'client', allow: ['shared', 'client', 'client-offline'] },
  { from: 'components', allow: ['shared', 'client', 'client-offline', 'components'] },
];

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'supabase/**',
      'public/sw.js',
      'public/swe-worker-*.js',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': elements,
      'boundaries/include': ['src/**/*'],
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
        node: true,
      },
    },
    rules: {
      'boundaries/element-types': ['error', { default: 'disallow', rules: layering }],
      'boundaries/no-unknown': 'error',
    },
  },
];

export default config;
