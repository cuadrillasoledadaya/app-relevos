import type { CollectionConfig } from 'payload'

import { readCuadrillaData, writeCuadrillaData } from './Users'

/**
 * Cuadrillas: the groups of costaleros that carry the paso.
 *
 * Access rule: `admin` has full access; `jefe` may create, update and delete
 * cuadrillas; `costalero` may only read them.
 */
export const Cuadrillas: CollectionConfig = {
  slug: 'cuadrillas',
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
        description: 'Nombre de la cuadrilla, por ejemplo "Cuadrilla de la Virgen".',
      },
    },
    {
      name: 'color',
      type: 'text',
      label: 'Color',
      admin: {
        description: 'Color con el que se identifica a la cuadrilla en el panel y en la app.',
      },
    },
    {
      name: 'notas',
      type: 'textarea',
      label: 'Notas',
      admin: {
        description: 'Notas internas de la cuadrilla: contacto, horarios, incidencias.',
      },
    },
  ],
}
