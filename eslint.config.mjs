import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * ESLint en modo flat config.
 *
 * Next.js 16 ya no trae `next lint`: se usa el CLI de ESLint directamente
 * (`pnpm lint`). `eslint-config-next` exporta configuración plana, así que no
 * se pasa por `FlatCompat`: en esta versión el traductor de formato eslintrc
 * choca con la estructura circular de los plugins y aborta la ejecución.
 *
 * Referencia: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md`.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  globalIgnores([
    // Ignores por defecto de `eslint-config-next`:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Ficheros generados por Payload:
    'src/payload-types.ts',
    'src/payload-generated-schema.ts',
  ]),
])

export default eslintConfig
