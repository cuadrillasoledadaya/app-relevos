/**
 * Los cinco puestos de una trabajadera, con el rótulo que ve la cuadrilla.
 *
 * El rol natural de un costalero y el puesto que ocupa debajo del paso son el
 * mismo tipo en el dominio (`RolCostalero` y `PuestoCostalero` son el mismo),
 * así que las opciones salen de ahí: la colección y el dominio no pueden
 * separarse sin que la app tenga que traducir los valores.
 *
 * El rótulo se calcula con `etiquetaPuesto`: en la primera y la última
 * trabajadera del paso el puesto es de patero y en las del medio de costero.
 * El valor guardado es siempre el mismo, sea cual sea la posición.
 */

import { PUESTOS_TRABAJADERA, etiquetaPuesto } from '../domain/types'

/** Opciones del selector de rol del costalero y del puesto de la plantilla. */
export const OPCIONES_PUESTO: { label: string; value: string }[] = PUESTOS_TRABAJADERA.map(
  (puesto) => ({ label: etiquetaPuesto(puesto, true), value: puesto }),
)
