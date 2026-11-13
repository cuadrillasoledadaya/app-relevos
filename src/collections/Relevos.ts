import type { CollectionConfig } from 'payload'

import { readCuadrillaData, writeCuadrillaData } from './Users'

/**
 * Relevos: the change of cuadrilla at a point of the route, with the people
 * assigned to each working position of the paso.
 *
 * Access rule: `admin` has full access; `jefe` may create, update and delete
 * relevos; `costalero` may only read them.
 */
export const Relevos: CollectionConfig = {
  slug: 'relevos',
  access: {
    read: readCuadrillaData,
    create: writeCuadrillaData,
    update: writeCuadrillaData,
    delete: writeCuadrillaData,
  },
  fields: [
    {
      name: 'paso',
      type: 'relationship',
      relationTo: 'pasos',
      required: true,
      label: 'Paso',
    },
    {
      name: 'orden',
      type: 'number',
      required: true,
      label: 'Orden',
      admin: {
        description: 'Orden del relevo dentro del paso, empezando por 1.',
      },
    },
    {
      name: 'punto',
      type: 'relationship',
      relationTo: 'puntos-de-relevo',
      required: true,
      label: 'Punto de relevo',
    },
    {
      name: 'cuadrillaEntrante',
      type: 'relationship',
      relationTo: 'cuadrillas',
      required: true,
      label: 'Cuadrilla entrante',
      admin: {
        description: 'Cuadrilla que entra en el paso en este relevo.',
      },
    },
    {
      name: 'cuadrillaSaliente',
      type: 'relationship',
      relationTo: 'cuadrillas',
      label: 'Cuadrilla saliente',
      admin: {
        description: 'Cuadrilla que sale del paso en este relevo, si la hay.',
      },
    },
    {
      name: 'estado',
      type: 'select',
      defaultValue: 'planificado',
      label: 'Estado',
      options: [
        { label: 'Planificado', value: 'planificado' },
        { label: 'En curso', value: 'en_curso' },
        { label: 'Completado', value: 'completado' },
        { label: 'Omitido', value: 'omitido' },
      ],
    },
    {
      name: 'asignaciones',
      type: 'array',
      label: 'Asignaciones',
      admin: {
        description: 'Costaleros que cubren cada trabajadera del paso en este relevo.',
      },
      fields: [
        {
          name: 'costalero',
          type: 'relationship',
          relationTo: 'costaleros',
          required: true,
          label: 'Costalero',
        },
        {
          name: 'trabajaderaId',
          type: 'text',
          required: true,
          label: 'Trabajadera',
          admin: {
            description: 'Identificador de la trabajadera del paso que cubre este costalero.',
          },
        },
      ],
    },
  ],
}
