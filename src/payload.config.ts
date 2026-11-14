import { postgresAdapter } from '@payloadcms/db-postgres'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Cuadrillas, Costaleros, Pasos, PuntosDeRelevo, Relevos, Users } from './collections'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Conexión a Postgres (Supabase).
 *
 * - `DATABASE_URL`: cadena de conexión de Supabase. Se recomienda la conexión
 *   directa (puerto 5432) para las migraciones y la agrupada (6543) para el
 *   tráfico de la app.
 * - `DATABASE_SSL`: `false` desactiva SSL (sólo para un Postgres local sin
 *   TLS; Supabase lo exige).
 * - `DATABASE_SCHEMA`: esquema donde viven las tablas. Supabase usa `public`,
 *   que ya es el esquema por defecto de Postgres: el adaptador rechaza que se
 *   le pase explícitamente, así que sólo se define cuando es otro esquema.
 * - `DATABASE_PUSH`: `true` sincroniza el esquema automáticamente en
 *   desarrollo. Por defecto está apagado: contra una base en la nube lo
 *   correcto es generar migraciones (`pnpm migrate:create`) y aplicarlas
 *   (`pnpm migrate`).
 */
const conexion = process.env.DATABASE_URL

const ssl =
  process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }

// Postgres ya trabaja en el esquema "public" por defecto. El adaptador de
// drizzle rechaza que se le pase "public" explícitamente ("You can't specify
// 'public' as schema name"), y hacerlo revienta la inicialización de Payload:
// por eso el esquema sólo se declara cuando es otro distinto.
const esquema = process.env.DATABASE_SCHEMA

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Cuadrillas, Costaleros, Pasos, Relevos, PuntosDeRelevo],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'SOLO-DESARROLLO-cambiar-en-produccion',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: conexion,
      ssl,
    },
    schemaName: esquema && esquema !== 'public' ? esquema : undefined,
    // Supabase no permite que la aplicación cree bases de datos.
    disableCreateDatabase: true,
    migrationDir: path.resolve(dirname, 'migrations'),
    push:
      process.env.DATABASE_PUSH === 'true' && process.env.NODE_ENV !== 'production',
  }),
  plugins: [
    mcpPlugin({
      collections: {
        users: { enabled: true },
        cuadrillas: { enabled: true },
        costaleros: { enabled: true },
        pasos: { enabled: true },
        relevos: { enabled: true },
        'puntos-de-relevo': { enabled: true },
      },
    }),
  ],
})
