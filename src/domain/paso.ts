import {
  CODIGO_NUMERO_TRABAJADERAS_INVALIDO,
  CODIGO_TRAMOS_INVALIDOS,
  ErrorDeDominio,
  MENSAJE_NUMERO_TRABAJADERAS_INVALIDO,
  MENSAJE_TRAMOS_INVALIDOS,
} from './errors'
import type { Paso, Trabajadera } from './types'

/** Mínimo número de trabajaderas que puede tener un paso. */
export const NUMERO_MINIMO_TRABAJADERAS = 1

/**
 * Tramos por defecto de la rotación de una trabajadera.
 *
 * Es el valor con el que trabaja el simulador de la cuadrilla, y el que hace
 * que el reparto de descansos de una trabajadera de 6 a 10 costaleros salga
 * exacto con los números de su ejemplo.
 */
export const TRAMOS_POR_DEFECTO = 12

/** Entrada para crear un paso. */
export interface EntradaCrearPaso {
  id: string
  nombre: string
  cuadrillaId: string
  /** Número de trabajaderas elegido libremente por la persona usuaria. */
  numeroTrabajaderas: number
  /** Tramos que rota cada trabajadera. Por defecto, `TRAMOS_POR_DEFECTO`. */
  tramosPorTrabajadera?: number
  hermandad?: string
  recorridoMetros?: number
}

/**
 * Identificador de una trabajadera dentro de la cuadrilla.
 *
 * Las trabajaderas de todos los pasos comparten una única tabla, en la que el
 * `id` es la clave primaria: el valor tiene que ser único en toda la
 * cuadrilla, no sólo dentro del paso. Por eso el identificador del paso forma
 * parte del identificador de la trabajadera.
 */
export function idTrabajadera(pasoId: string, numero: number): string {
  return `trab-${pasoId}-${numero}`
}

/**
 * Reparto de las trabajaderas de un paso.
 *
 * - Las trabajaderas se numeran de 1 a N, de izquierda a derecha.
 * - La mitad izquierda recibe `ceil(N/2)` trabajaderas y la derecha `floor(N/2)`.
 * - Cada una rota durante sus propios tramos: la rotación es por trabajadera.
 */
export function crearTrabajaderas(
  pasoId: string,
  numeroTrabajaderas: number,
  tramos: number = TRAMOS_POR_DEFECTO,
): Trabajadera[] {
  assertNumeroTrabajaderas(numeroTrabajaderas)
  assertTramos(tramos)

  const total = Math.floor(numeroTrabajaderas)
  const enIzquierda = Math.ceil(total / 2)

  const trabajaderas: Trabajadera[] = []

  for (let numero = 1; numero <= total; numero += 1) {
    const lado = numero <= enIzquierda ? 'izquierda' : 'derecha'

    trabajaderas.push({ id: idTrabajadera(pasoId, numero), numero, lado, tramos })
  }

  return trabajaderas
}

/** Valida el número de trabajaderas pedido y lanza el error de dominio si no es válido. */
export function assertNumeroTrabajaderas(numeroTrabajadieras: number): void {
  if (
    typeof numeroTrabajadieras !== 'number' ||
    !Number.isInteger(numeroTrabajadieras) ||
    numeroTrabajadieras < NUMERO_MINIMO_TRABAJADERAS
  ) {
    throw new ErrorDeDominio(
      CODIGO_NUMERO_TRABAJADERAS_INVALIDO,
      MENSAJE_NUMERO_TRABAJADERAS_INVALIDO,
    )
  }
}

/** Valida el número de tramos de una trabajadera y lanza el error de dominio si no es válido. */
export function assertTramos(tramos: number): void {
  if (typeof tramos !== 'number' || !Number.isInteger(tramos) || tramos < 1) {
    throw new ErrorDeDominio(CODIGO_TRAMOS_INVALIDOS, MENSAJE_TRAMOS_INVALIDOS)
  }
}

/**
 * Crea un paso con el número de trabajaderas elegido por la persona usuaria.
 * Es determinista: la misma entrada produce siempre el mismo paso.
 */
export function crearPaso(entrada: EntradaCrearPaso): Paso {
  const trabajaderas = crearTrabajaderas(
    entrada.id,
    entrada.numeroTrabajaderas,
    entrada.tramosPorTrabajadera ?? TRAMOS_POR_DEFECTO,
  )

  return {
    id: entrada.id,
    nombre: entrada.nombre,
    cuadrillaId: entrada.cuadrillaId,
    ...(entrada.hermandad ? { hermandad: entrada.hermandad } : {}),
    ...(entrada.recorridoMetros !== undefined
      ? { recorridoMetros: entrada.recorridoMetros }
      : {}),
    trabajaderas,
  }
}
