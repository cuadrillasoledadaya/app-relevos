import type { CollectionConfig } from 'payload'

import { readCuadrillaData, writeCuadrillaData } from './Users'

/**
 * Pasos: the paso that is carried and the working positions under it.
 *
 * Access rule: `admin` has full access; `jefe` may create, update and delete
 * pasos; `costalero` may only read them.
 */
export const Pasos: CollectionConfig = {
  slug: 'pasos',
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
        description: 'Nombre del paso, por ejemplo "Paso de la Virgen del Carmen".',
      },
    },
    {
      name: 'hermandad',
      type: 'text',
      label: 'Hermandad',
      admin: {
        description: 'Hermandad a la que pertenece el paso.',
      },
    },
    {
      name: 'cuadrilla',
      type: 'relationship',
      relationTo: 'cuadrillas',
      required: true,
      label: 'Cuadrilla titular',
      admin: {
        description: 'Cuadrilla que porta el paso.',
      },
    },
    {
      name: 'recorridoMetros',
      type: 'number',
      label: 'Recorrido (metros)',
      admin: {
        description: 'Distancia estimada del recorrido, en metros.',
      },
    },
    {
      name: 'trabajadoras',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Trabajaderas',
      admin: {
        description:
          'Puestos bajo el paso. El número de trabajaderas lo eliges tú: añade todas las que haga falta, sin límite.',
      },
      fields: [
        {
          name: 'id',
          type: 'text',
          required: true,
          label: 'Identificador',
          admin: {
            description:
              'Código de la trabajadera, por ejemplo "trab-1". Es el dato que se usa al asignar costaleros.',
          },
        },
        {
          name: 'numero',
          type: 'number',
          required: true,
          label: 'Número',
          admin: {
            description: 'Posición de la trabajadera en el orden del paso, empezando por 1.',
          },
        },
        {
          name: 'lado',
          type: 'select',
          required: true,
          label: 'Lado',
          options: [
            { label: 'Izquierda', value: 'izquierda' },
            { label: 'Derecha', value: 'derecha' },
          ],
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          label: 'Tipo',
          options: [
            { label: 'Centro', value: 'centro' },
            { label: 'Cruz', value: 'cruz' },
            { label: 'Tambor', value: 'tambor' },
            { label: 'Puesto', value: 'puesto' },
          ],
        },
      ],
    },
  ],
}
