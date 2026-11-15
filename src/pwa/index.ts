/**
 * Punto de entrada de la capa offline de la PWA.
 *
 * La app importa desde aquí: el contrato, la creación de la capa y la
 * instancia por defecto ya conectada al almacenamiento local.
 */

import { adaptadorPorDefecto } from './adaptador-indicedb';
import { crearCapaOffline } from './capa-offline';
import type { CapaOffline } from './contrato';

export * from './contrato';
export { crearCapaOffline } from './capa-offline';

/** Capa por defecto, creada de forma perezosa. */
let capaPorDefecto: CapaOffline | null = null;

/**
 * Devuelve la capa offline por defecto: almacenamiento local (IndexedDB con
 * respaldo en memoria) y envío por `fetch`.
 */
export function capaOfflinePorDefecto(): CapaOffline {
  if (!capaPorDefecto) {
    capaPorDefecto = crearCapaOffline(adaptadorPorDefecto());
  }

  return capaPorDefecto;
}
