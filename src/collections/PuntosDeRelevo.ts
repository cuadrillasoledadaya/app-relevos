import type { CollectionConfig } from 'payload'

import { readCuadrillaData, writeCuadrillaData } from './Users'

/**
 * Puntos de relevo: the spots of the route where a cuadrilla is replaced.
 *
 * Access rule: `admin` has full access; `jefe` may create, update and delete
 * puntos de relevo; `costalero` may only read them.
 */
export const PuntosDeRelevo: CollectionConfig = {
  slug: 'puntos-de-relevo',
  admin: {
    useAsTitle: 'nombre',
  },
  access: {
    read: readCuadrillaData,
    create: writeCuadrillaData,
    update: writeCuadrillaData,
    delete: writeCuadrillaData,
  },
  fields: [
    {
      name: 'nombre',
      type: 'text',
      required: true,
      label: 'Nombre',
      admin: {
        description: 'Nombre del punto de relevo, por ejemplo "Plaza de la Iglesia".',
      },
    },
    {
      name: 'calle',
      type: 'text',
      label: 'Calle',
      admin: {
        description: 'Calle o lugar exacto donde se hace el relevo.',
      },
    },
    {
      name: 'orden',
      type: 'number',
      required: true,
      label: 'Orden',
      admin: {
        description: 'Orden del punto a lo largo del recorrido, empezando por 1.',
      },
    },
  ],
}
