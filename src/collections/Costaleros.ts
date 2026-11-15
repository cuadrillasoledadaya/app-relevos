import type { CollectionConfig } from 'payload'

import { OPCIONES_PUESTO } from './puestos'
import { readCuadrillaData, writeCuadrillaData } from './Users'

/**
 * Costaleros: the people who carry the paso.
 *
 * Each costalero belongs to one working position for the whole plan: the
 * rotation happens inside the working position, tramo a tramo.
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
      name: 'trabajadoraId',
      type: 'text',
      required: true,
      label: 'Trabajadera',
      admin: {
        description:
          'Identificador de la trabajadera del paso a la que pertenece el costalero, por ejemplo "trab-12-3". El costalero pertenece a una sola trabajadera durante todo el plan: no cambia de posición de un tramo a otro.',
      },
    },
    {
      name: 'rol',
      type: 'select',
      required: true,
      label: 'Rol',
      options: OPCIONES_PUESTO,
      admin: {
        description:
          'Rol natural del costalero: el puesto que ocupa por naturaleza. Los pateros son de nivel 3, los fijadores de nivel 2 y los corrientes de nivel 1. Nadie puede ocupar un puesto dos niveles por encima o por debajo del suyo. No tiene valor por defecto: un rol inventado rompe el reparto por niveles de altura.',
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
          'Un costalero que no está disponible no rota: no recibe asignaciones en ningún tramo.',
      },
    },
  ],
}
