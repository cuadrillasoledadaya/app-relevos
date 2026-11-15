import type { CollectionConfig } from 'payload'

import { OPCIONES_PUESTO } from './puestos'
import { readCuadrillaData, writeCuadrillaData } from './Users'

/**
 * Relevos: the plan of a paso, frozen at the moment it is delivered.
 *
 * The plan is calculated on the fly with the domain every time the paso is
 * opened; when it is delivered, a copy of its tramos is saved here: the point
 * of the route of each tramo, its state and the template of every working
 * position (who goes under the paso and in which puesto). The copy is frozen:
 * it is what gets printed, audited and read by the agents.
 *
 * Access rule: `admin` has full access; `jefe` may create, update and delete
 * relevos; `costalero` may only read them.
 */
export const Relevos: CollectionConfig = {
  slug: 'relevos',
  admin: {
    description:
      'Planes entregados: la copia congelada de la rotación de un paso, con sus tramos y la plantilla de cada trabajadera.',
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
        description: 'Paso al que pertenece el plan entregado.',
      },
    },
    {
      name: 'tramos',
      type: 'array',
      label: 'Tramos',
      admin: {
        description:
          'Tramos del plan, en orden. Cada tramo guarda el punto del recorrido, su estado y la plantilla de cada trabajadera.',
      },
      fields: [
        {
          name: 'orden',
          type: 'number',
          required: true,
          min: 1,
          label: 'Orden',
          admin: {
            description: 'Orden del tramo dentro del plan, empezando por 1.',
          },
        },
        {
          name: 'punto',
          type: 'relationship',
          relationTo: 'puntos-de-relevo',
          label: 'Punto de relevo',
          admin: {
            description:
              'Punto del recorrido en el que se entrega el tramo. Si el paso no tiene puntos de relevo, el tramo se identifica sólo por su orden.',
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
          label: 'Plantilla de la trabajadera',
          admin: {
            description:
              'Costaleros que van debajo del paso en este tramo, con el puesto que ocupa cada uno en su trabajadera. Los costaleros que no aparecen descansan.',
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
              name: 'trabajadoraId',
              type: 'text',
              required: true,
              label: 'Trabajadera',
              admin: {
                description:
                  'Identificador de la trabajadera del paso donde va este costalero, por ejemplo "trab-12-3".',
              },
            },
            {
              name: 'puesto',
              type: 'select',
              required: true,
              label: 'Puesto',
              options: OPCIONES_PUESTO,
              admin: {
                description:
                  'Puesto que ocupa debajo del paso. En la primera y la última trabajadera del paso el puesto es de patero y en las del medio de costero.',
              },
            },
          ],
        },
      ],
    },
  ],
}
