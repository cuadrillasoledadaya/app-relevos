import type { CollectionConfig } from 'payload'

import { readCuadrillaData, writeCuadrillaData } from './Users'

/**
 * Fijaciones: the manual pins of the rotation (rule R6).
 *
 * A fixing is a decision of the cuadrilla: "in this tramo, this costalero
 * goes out". The planner has to respect it and a rule checks that it did.
 *
 * The `tramo` is counted over the rotation of the working position of the
 * costalero, which is why the fixing names the paso it belongs to.
 *
 * Access rule: `admin` has full access; `jefe` may create, update and delete
 * fijaciones; `costalero` may only read them.
 */
export const Fijaciones: CollectionConfig = {
  slug: 'fijaciones',
  labels: {
    singular: 'Fijación',
    plural: 'Fijaciones',
  },
  // El singular automático de Payload ("fijacione") no es el de la cuadrilla.
  typescript: {
    interface: 'Fijacion',
  },
  admin: {
    description:
      'Fijaciones manuales de la rotación: un costalero queda dentro o fuera del paso en un tramo.',
    defaultColumns: ['paso', 'costalero', 'tramo', 'estado'],
  },
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
      admin: {
        description: 'Paso al que pertenece la fijación.',
      },
    },
    {
      name: 'costalero',
      type: 'relationship',
      relationTo: 'costaleros',
      required: true,
      label: 'Costalero',
      admin: {
        description: 'Costalero al que se le fija el puesto en ese tramo.',
      },
    },
    {
      name: 'tramo',
      type: 'number',
      required: true,
      min: 1,
      label: 'Tramo',
      admin: {
        description:
          'Tramo de la rotación de la trabajadera del costalero, empezando por 1. Cada trabajadera rota con su propio número de tramos.',
      },
    },
    {
      name: 'estado',
      type: 'select',
      required: true,
      label: 'Estado',
      options: [
        { label: 'Dentro del paso', value: 'dentro' },
        { label: 'Fuera del paso', value: 'fuera' },
      ],
      admin: {
        description:
          'Si el costalero va debajo del paso ("dentro") o si descansa ("fuera") en ese tramo.',
      },
    },
  ],
}
