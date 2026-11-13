import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Cuadrillas, Costaleros, Pasos, PuntosDeRelevo, Relevos, Users } from './collections'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

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
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || process.env.DATABASE_URI || 'file:./dev.db',
    },
    push: process.env.NODE_ENV !== 'production',
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
