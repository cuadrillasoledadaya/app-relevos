/**
 * Contrato de dominio de la cuadrilla de costaleros.
 *
 * Este archivo es la frontera compartida: no depende de React, de Next.js ni de
 * Payload. Todo lo que se importa desde aquí es puro TypeScript para que las
 * reglas de relevo se puedan testear, auditar y reutilizar sin arranque de app.
 *
 * Vocabulario:
 * - Paso: el paso que se porta; define cuántas trabajaderas tiene.
 * - Trabajadera: cada posición bajo el paso. Tiene su propio grupo de
 *   costaleros y rota por su cuenta a lo largo de sus tramos.
 * - Cuadrilla: el grupo de costaleros que se gestiona.
 * - Tramo: cada segmento del recorrido. En cada tramo, cada trabajadera tiene
 *   su plantilla: quién va debajo del paso y quién descansa.
 */

/** Lado del paso en el que se sitúa una trabajadera. */
export type Lado = 'izquierda' | 'derecha'

/** Hombro preferido para cargar el paso. */
export type Hombro = 'izquierdo' | 'derecho'

/** Severidad de un hallazgo de regla. `error` bloquea, `warning` sólo informa. */
export type Severidad = 'error' | 'warning'

/** Rol natural de un costalero: el puesto que ocupa por naturaleza. */
export type RolCostalero =
  | 'patero-izquierdo'
  | 'patero-derecho'
  | 'fijador-izquierdo'
  | 'fijador-derecho'
  | 'corriente'

/** Puesto que un costalero ocupa debajo del paso. */
export type PuestoCostalero = RolCostalero

/** Nivel de altura de cada rol y de cada puesto. */
export const NIVEL_ROL: Record<RolCostalero, number> = {
  'patero-izquierdo': 3,
  'patero-derecho': 3,
  'fijador-izquierdo': 2,
  'fijador-derecho': 2,
  corriente: 1,
}

/** Los cinco puestos de cada trabajadera, en el orden en que se reparten. */
export const PUESTOS_TRABAJADERA: readonly PuestoCostalero[] = [
  'patero-izquierdo',
  'patero-derecho',
  'fijador-izquierdo',
  'fijador-derecho',
  'corriente',
]

/**
 * Rótulo del puesto según la posición de la trabajadera.
 *
 * La primera y la última trabajadera del paso son de patero; las del medio, de
 * costero. El puesto en sí es el mismo: lo que cambia es cómo lo nombra la
 * cuadrilla.
 */
export function etiquetaPuesto(puesto: PuestoCostalero, esExtrema: boolean): string {
  const etiquetas: Record<PuestoCostalero, string> = esExtrema
    ? {
        'patero-izquierdo': 'Patero izquierdo',
        'patero-derecho': 'Patero derecho',
        'fijador-izquierdo': 'Fijador izquierdo',
        'fijador-derecho': 'Fijador derecho',
        corriente: 'Corriente',
      }
    : {
        'patero-izquierdo': 'Costero izquierdo',
        'patero-derecho': 'Costero derecho',
        'fijador-izquierdo': 'Fijador izquierdo',
        'fijador-derecho': 'Fijador derecho',
        corriente: 'Corriente',
      }

  return etiquetas[puesto]
}

/** Cuadrilla de costaleros: el grupo que se gestiona. */
export interface Cuadrilla {
  id: string
  nombre: string
  /** Color identificativo para la interfaz (opcional). */
  color?: string
  /** Número de costaleros disponibles de la cuadrilla. */
  disponible?: boolean
}

/** Persona costalera de la cuadrilla. */
export interface Costalero {
  id: string
  nombre: string
  /** Cuadrilla a la que pertenece: el grupo que se gestiona. */
  cuadrillaId: string
  /** Trabajadera del paso en la que se coloca: una sola, para todo el plan. */
  trabajaderaId: string
  /** Rol natural: el puesto que ocupa por naturaleza. */
  rol: RolCostalero
  telefono?: string
  alturaCm?: number
  hombroPreferido?: Hombro
  /** Un costalero no disponible no puede recibir asignación. */
  disponible: boolean
}

/** Puesto de carga del paso. */
export interface Trabajadera {
  id: string
  /** Posición en el orden del paso, de 1 a N. */
  numero: number
  lado: Lado
  /**
   * Tramos del recorrido que recorre la rotación de esta trabajadera.
   *
   * Es propio de cada trabajadera: es lo que permite que el reparto de
   * descansos de cada una salga exacto.
   */
  tramos: number
}

/** El paso que se porta y sus trabajaderas. */
export interface Paso {
  id: string
  nombre: string
  hermandad?: string
  /** Cuadrilla titular del paso. */
  cuadrillaId: string
  /** Exactamente `numeroTrabajaderas` entradas, numeradas de 1 a N. */
  trabajaderas: Trabajadera[]
  /** Distancia de recorrido estimada, en metros (opcional). */
  recorridoMetros?: number
}

/** Punto del recorrido. */
export interface PuntoDeRelevo {
  id: string
  nombre: string
  calle?: string
  /** Orden del punto a lo largo del recorrido. */
  orden: number
}

/** Estado de un tramo. */
export type EstadoTramo = 'planificado' | 'en_curso' | 'completado' | 'omitido'

/** Estado de una fijación manual: el costalero queda dentro o fuera en ese tramo. */
export type EstadoFijacion = 'dentro' | 'fuera'

/**
 * Fijación manual de un costalero en un tramo (regla R6).
 *
 * Es una decisión de la cuadrilla: "este tramo, este costalero va fuera". El
 * planificador tiene que respetarla, y una regla comprueba que la respetó.
 */
export interface FijacionCostalero {
  costaleroId: string
  /** Tramo de la rotación de la trabajadera del costalero, de 1 a N. */
  tramo: number
  estado: EstadoFijacion
}

/** Asignación de un costalero a un puesto de una trabajadera en un tramo. */
export interface AsignacionCostalero {
  costaleroId: string
  /** Trabajadera en la que se coloca. */
  trabajaderaId: string
  /** Puesto que ocupa debajo del paso. */
  puesto: PuestoCostalero
}

/** Tramo persistido. */
export interface Tramo {
  id: string
  pasoId: string
  /** Orden del tramo dentro del paso, de 1 a N. */
  orden: number
  puntoId: string
  estado: EstadoTramo
  asignaciones: AsignacionCostalero[]
}

/** Tramo calculado por el planificador, antes de persistirse. */
export interface TramoPlanificado {
  orden: number
  puntoId: string
  asignaciones: AsignacionCostalero[]
}

/** Plan completo de la rotación de un paso. */
export interface PlanDeRotacion {
  pasoId: string
  tramos: TramoPlanificado[]
}

/** Hallazgo producido por una regla. */
export interface Hallazgo {
  /** Identificador de la regla que produjo el hallazgo. */
  reglaId: string
  severidad: Severidad
  /** Mensaje legible para la persona usuaria, en español. */
  mensaje: string
  /** Contexto mínimo para trazar el hallazgo hasta su origen. */
  contexto?: Record<string, unknown>
}

/** Resultado de evaluar un conjunto de reglas. */
export interface ResultadoValidacion {
  /** `true` cuando no hay hallazgos de severidad `error`. */
  valido: boolean
  hallazgos: Hallazgo[]
}

/**
 * Parámetros de la rotación que la cuadrilla puede ajustar.
 *
 * No son invariantes: son los números con los que la cuadrilla decide cómo
 * rota su paso. Cada uno tiene un valor por defecto que preserva el
 * comportamiento del simulador de la cuadrilla.
 */
export interface ConfigRotacion {
  /**
   * Costaleros debajo del paso en cada trabajadera y tramo (regla R1).
   *
   * Por defecto `5`: los cinco puestos de la trabajadera. En el simulador de
   * la cuadrilla también es `5`.
   */
  costalerosPorTrabajadera: number
  /**
   * Tramos seguidos como máximo sin asignación (regla R3).
   *
   * Por defecto `2`, el mismo valor que usa la cuadrilla.
   */
  maxTramosFueraSeguidos: number
}

/** Valores por defecto de la rotación: los del simulador de la cuadrilla. */
export const CONFIG_ROTACION_POR_DEFECTO: ConfigRotacion = {
  costalerosPorTrabajadera: 5,
  maxTramosFueraSeguidos: 2,
}

/** Contexto que una regla recibe para evaluar. */
export interface ContextoReglas {
  paso: Paso
  plan: PlanDeRotacion
  costaleros: Costalero[]
  /** Parámetros de la rotación; si no se dan, rigen los valores por defecto. */
  config?: ConfigRotacion
  /** Fijaciones manuales que el plan tiene que respetar (regla R6). */
  fijaciones?: FijacionCostalero[]
}

/**
 * Regla del motor. Añadir una regla nueva es registrarla en la lista activa:
 * el motor no se modifica.
 */
export interface Regla {
  id: string
  severidad: Severidad
  descripcion: string
  evaluar(contexto: ContextoReglas): Hallazgo[]
}

/** Motor de reglas: evalúa el contexto y agrega los hallazgos de cada regla. */
export interface MotorReglas {
  evaluar(contexto: ContextoReglas): ResultadoValidacion
}

/** Entrada del planificador de la rotación. */
export interface EntradaRotacion {
  paso: Paso
  costaleros: Costalero[]
  /** Puntos del recorrido: cada tramo toma el punto de su orden. */
  puntos?: PuntoDeRelevo[]
  /** Parámetros de la rotación; si no se dan, rigen los valores por defecto. */
  config?: ConfigRotacion
  /** Fijaciones manuales por tramo (regla R6). */
  fijaciones?: FijacionCostalero[]
}
