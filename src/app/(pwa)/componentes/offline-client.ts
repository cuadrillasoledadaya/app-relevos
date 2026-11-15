'use client'

import { capaOfflinePorDefecto } from '@/pwa'
import type { EscrituraPendiente, NuevaEscritura } from '@/pwa'

/**
 * Puente entre las pantallas y la capa offline.
 *
 * Las pantallas usan siempre la capa por defecto (IndexedDB con respaldo en
 * memoria), de modo que el resto de la app no necesita saber cómo se guarda
 * cada dato.
 */

/** Guarda una lectura cacheada a través de la capa por defecto. */
export async function guardarLectura(clave: string, datos: unknown): Promise<void> {
  await capaOfflinePorDefecto().guardarLectura(clave, datos)
}

/** Lee una lectura cacheada a través de la capa por defecto. */
export async function leerLectura<T>(clave: string): Promise<T | null> {
  return capaOfflinePorDefecto().leerLectura<T>(clave)
}

/** Encola una escritura a través de la capa por defecto. */
export async function encolarEscritura(entrada: NuevaEscritura): Promise<EscrituraPendiente> {
  return capaOfflinePorDefecto().encolarEscritura(entrada)
}
