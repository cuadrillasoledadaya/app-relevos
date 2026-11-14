import {
  CODIGO_NUMERO_TRABAJADERAS_INVALIDO,
  ErrorDeDominio,
  MENSAJE_NUMERO_TRABAJADERAS_INVALIDO,
} from './errors';
import type { Paso, TipoTrabajadera, Trabajadera } from './types';

/** Mínimo número de trabajaderas que puede tener un paso. */
export const NUMERO_MINIMO_TRABAJADERAS = 1;

/** Entrada para crear un paso. */
export interface EntradaCrearPaso {
  id: string;
  nombre: string;
  cuadrillaId: string;
  /** Número de trabajaderas elegido libremente por la persona usuaria. */
  numeroTrabajaderas: number;
  hermandad?: string;
  recorridoMetros?: number;
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
  return `trab-${pasoId}-${numero}`;
}

/**
 * Reparto de las trabajaderas de un paso (regla v1, a pulir con el tiempo).
 *
 * - Las trabajaderas se numeran de 1 a N, de izquierda a derecha.
 * - La mitad izquierda recibe `ceil(N/2)` trabajaderas y la derecha `floor(N/2)`.
 * - Con N impar, la primera trabajadera (número 1) es de tipo `centro`.
 */
export function crearTrabajaderas(
  pasoId: string,
  numeroTrabajaderas: number,
): Trabajadera[] {
  assertNumeroTrabajaderas(numeroTrabajaderas);

  const total = Math.floor(numeroTrabajaderas);
  const enIzquierda = Math.ceil(total / 2);

  const trabajadoras: Trabajadera[] = [];

  for (let numero = 1; numero <= total; numero += 1) {
    const lado = numero <= enIzquierda ? 'izquierda' : 'derecha';
    const tipo: TipoTrabajadera = total % 2 === 1 && numero === 1 ? 'centro' : 'puesto';

    trabajadoras.push({ id: idTrabajadera(pasoId, numero), numero, lado, tipo });
  }

  return trabajadoras;
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
    );
  }
}

/**
 * Crea un paso con el número de trabajaderas elegido por la persona usuaria.
 * Es determinista: la misma entrada produce siempre el mismo paso.
 */
export function crearPaso(entrada: EntradaCrearPaso): Paso {
  const trabajaderas = crearTrabajaderas(entrada.id, entrada.numeroTrabajaderas);

  return {
    id: entrada.id,
    nombre: entrada.nombre,
    cuadrillaId: entrada.cuadrillaId,
    ...(entrada.hermandad ? { hermandad: entrada.hermandad } : {}),
    ...(entrada.recorridoMetros !== undefined
      ? { recorridoMetros: entrada.recorridoMetros }
      : {}),
    trabajaderas,
  };
}
