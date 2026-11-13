import type { Access, CollectionConfig, PayloadRequest, Where } from 'payload'

/**
 * Accounts of the cuadrilla.
 *
 * This module also hosts the shared role helpers: the role lives on the user,
 * and the barrel of `src/collections` only re-exports the six collections, so
 * every collection resolves its access rules from here.
 */

/** Roles understood by the admin panel and by the MCP server. */
export type Rol = 'admin' | 'jefe' | 'costalero'

/**
 * Reads the role of the authenticated user.
 *
 * The generated Payload types do not know the `rol` field yet, so it is read
 * through a narrow cast instead of editing `payload-types.ts`. This is the
 * only place where a role is resolved, so the MCP API keys work can extend
 * the mapping in a single spot.
 */
export function getRol(req: PayloadRequest): Rol | null {
  const rol = (req.user as { rol?: string } | null | undefined)?.rol

  return rol === 'admin' || rol === 'jefe' || rol === 'costalero' ? rol : null
}

/** True when the request is authenticated as an administrator. */
export function isAdmin(req: PayloadRequest): boolean {
  return getRol(req) === 'admin'
}

/** True when the request is authenticated as a cuadrilla manager. */
export function isJefe(req: PayloadRequest): boolean {
  return getRol(req) === 'jefe'
}

/**
 * Shared read rule for the cuadrilla data collections: any authenticated user
 * with a known role reads them, anonymous requests are denied.
 */
export const readCuadrillaData: Access = ({ req }) => getRol(req) !== null

/**
 * Shared write rule for the cuadrilla data collections: administrators and
 * cuadrilla managers write them, costaleros have no write access at all.
 */
export const writeCuadrillaData: Access = ({ req }) => isAdmin(req) || isJefe(req)

/**
 * Administrators and cuadrilla managers read every account; a costalero only
 * reads its own account, scoped with a typed `where` query.
 */
const readUsers: Access = ({ req }) => {
  const rol = getRol(req)

  if (rol === 'admin' || rol === 'jefe') {
    return true
  }

  if (rol === 'costalero') {
    const where: Where = { id: { equals: req.user?.id } }

    return where
  }

  return false
}

/** Only administrators create accounts. */
const createUsers: Access = ({ req }) => isAdmin(req)

/** Administrators and cuadrilla managers update accounts. */
const updateUsers: Access = ({ req }) => isAdmin(req) || isJefe(req)

/** Only administrators delete accounts. */
const deleteUsers: Access = ({ req }) => isAdmin(req)

/**
 * Accounts of the cuadrilla.
 *
 * Access rule: `admin` has full access; `jefe` reads and updates accounts but
 * can never create or delete them; `costalero` only reads its own account and
 * has no write access at all. Only an administrator can grant a role.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: readUsers,
    create: createUsers,
    update: updateUsers,
    delete: deleteUsers,
  },
  hooks: {
    /**
     * The very first account of a fresh installation becomes an administrator.
     *
     * Without this, the first registered user would keep the default role
     * (`costalero`) and the installation would have nobody able to administer
     * it. Later accounts are never promoted here.
     */
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data

        const { totalDocs } = await req.payload.count({ collection: 'users' })

        if (totalDocs === 0) {
          return { ...data, rol: 'admin' }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'rol',
      type: 'select',
      required: true,
      defaultValue: 'costalero',
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Jefe de cuadrilla', value: 'jefe' },
        { label: 'Costalero', value: 'costalero' },
      ],
      admin: {
        description:
          'Rol de la persona en el panel de administración: decide qué puede consultar, crear y editar.',
      },
      access: {
        read: () => true,
        create: ({ req }) => isAdmin(req),
        update: ({ req }) => isAdmin(req),
      },
    },
  ],
}
