import type { CollectionConfig } from 'payload'

import { readCuadrillaData, writeCuadrillaData } from './Users'

/**
 * Costaleros: the people who carry the paso.
 *
 * Access rule: `admin` has full access; `jefe` may create, update and delete
 * costaleros; `costalero` may only read them.
 */
export const Costaleros: CollectionConfig = {
  slug: 'costaleros',
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
        description: 'Nombre y apellidos del costalero.',
      },
    },
    {
      name: 'cuadrilla',
      type: 'relationship',
      relationTo: 'cuadrillas',
      required: true,
      label: 'Cuadrilla',
      admin: {
        description: 'Cuadrilla a la que pertenece el costalero.',
      },
    },
    {
      name: 'telefono',
      type: 'text',
      label: 'Teléfono',
      admin: {
        description: 'Teléfono de contacto para los avisos de relevo.',
      },
    },
    {
      name: 'alturaCm',
      type: 'number',
      label: 'Altura (cm)',
      admin: {
        description: 'Altura en centímetros, sirve para emparejar los puestos del paso.',
      },
    },
    {
      name: 'hombroPreferido',
      type: 'select',
      label: 'Hombro preferido',
      options: [
        { label: 'Izquierdo', value: 'izquierdo' },
        { label: 'Derecho', value: 'derecho' },
      ],
      admin: {
        description: 'Hombro con el que suele cargar el paso.',
      },
    },
    {
      name: 'disponible',
      type: 'checkbox',
      defaultValue: true,
      label: 'Disponible',
      admin: {
        description:
          'Un costalero que no está disponible no puede recibir asignaciones en un relevo.',
      },
    },
  ],
}
