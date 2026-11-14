/**
 * Contrato de dominio de la cuadrilla de costaleros.
 *
 * Este archivo es la frontera compartida: no depende de React, de Next.js ni de
 * Payload. Todo lo que se importa desde aquí es puro TypeScript para que las
 * reglas de relevo se puedan testear, auditar y reutilizar sin arranque de app.
 *
 * Vocabulario:
 * - Paso: el paso que se porta; define cuántas "trabajaderas" tiene.
 * - Trabajadera: cada puesto bajo el paso donde se coloca un costalero.
 * - Cuadrilla: el grupo de costaleros que releva.
 * - Relevo: el cambio de cuadrilla en un punto concreto del recorrido.
 */

/** Lado del paso en el que se sitúa una trabajadera. */
export type Lado = 'izquierda' | 'derecha';

/** Función que cumple una trabajadera dentro del paso. */
export type TipoTrabajadera = 'centro' | 'cruz' | 'tambor' | 'puesto';

/** Hombro preferido para cargar el paso. */
export type Hombro = 'izquierdo' | 'derecho';

/** Severidad de un hallazgo de regla. `error` bloquea, `warning` sólo informa. */
export type Severidad = 'error' | 'warning';

/** Cuadrilla de costaleros. */
export interface Cuadrilla {
  id: string;
  nombre: string;
  /** Color identificativo para la interfaz (opcional). */
  color?: string;
  /** Número de costaleros disponibles de la cuadrilla. */
  disponible?: boolean;
}

/** Persona costalera de la cuadrilla. */
export interface Costalero {
  id: string;
  nombre: string;
  cuadrillaId: string;
  telefono?: string;
  alturaCm?: number;
  hombroPreferido?: Hombro;
  /** Un costalero no disponible no puede recibir asignación en un relevo. */
  disponible: boolean;
}

/** Puesto de carga del paso. */
export interface Trabajadera {
  id: string;
  /** Posición en el orden del paso, de 1 a N. */
  numero: number;
  lado: Lado;
  tipo: TipoTrabajadera;
}

/** El paso que se porta y sus trabajaderas. */
export interface Paso {
  id: string;
  nombre: string;
  hermandad?: string;
  /** Cuadrilla titular del paso. */
  cuadrillaId: string;
  /** Exactamente `numeroTrabajaderas` entradas, numeradas de 1 a N. */
  trabajaderas: Trabajadera[];
  /** Distancia de recorrido estimada, en metros (opcional). */
  recorridoMetros?: number;
}

/** Punto del recorrido donde se produce un relevo. */
export interface PuntoDeRelevo {
  id: string;
  nombre: string;
  calle?: string;
  /** Orden del punto a lo largo del recorrido. */
  orden: number;
}

/** Estado de un relevo. */
export type EstadoRelevo = 'planificado' | 'en_curso' | 'completado' | 'omitido';

/** Asignación de un costalero a una trabajadera en un relevo. */
export interface AsignacionCostalero {
  costaleroId: string;
  trabajaderaId: string;
}

/** Relevo persistido. */
export interface Relevo {
  id: string;
  pasoId: string;
  /** Orden del relevo dentro del paso, de 1 a N. */
  orden: number;
  puntoId: string;
  cuadrillaEntranteId: string;
  cuadrillaSalienteId?: string;
  estado: EstadoRelevo;
  asignaciones: AsignacionCostalero[];
}

/** Relevo calculado por el planificador, antes de persistirse. */
export interface RelevoPlanificado {
  orden: number;
  puntoId: string;
  cuadrillaEntranteId: string;
  cuadrillaSalienteId?: string;
  asignaciones: AsignacionCostalero[];
}

/** Plan completo de relevos de un paso. */
export interface PlanDeRelevo {
  pasoId: string;
  relevos: RelevoPlanificado[];
}

/** Hallazgo producido por una regla. */
export interface Hallazgo {
  /** Identificador de la regla que produjo el hallazgo. */
  reglaId: string;
  severidad: Severidad;
  /** Mensaje legible para la persona usuaria, en español. */
  mensaje: string;
  /** Contexto mínimo para trazar el hallazgo hasta su origen. */
  contexto?: Record<string, unknown>;
}

/** Resultado de evaluar un conjunto de reglas. */
export interface ResultadoValidacion {
  /** `true` cuando no hay hallazgos de severidad `error`. */
  valido: boolean;
  hallazgos: Hallazgo[];
}

/**
 * Parámetros del relevo que la cuadrilla puede ajustar.
 *
 * No son invariantes: son los números con los que la cuadrilla decide cómo
 * trabaja su paso. Cada uno tiene un valor por defecto que preserva el
 * comportamiento actual del planificador.
 */
export interface ConfigRelevo {
  /**
   * Costaleros asignados a cada trabajadera en cada relevo (regla R1).
   *
   * Por defecto `1`: en este proyecto una trabajadera es un puesto bajo el
   * paso donde se coloca un costalero. La cuadrilla que lleva cinco personas
   * por puesto lo sube a `5`.
   */
  costalerosPorTrabajadera: number;
  /**
   * Relevos seguidos como máximo sin asignación (regla R3).
   *
   * Por defecto `2`, el mismo valor que usa la cuadrilla.
   */
  maxRelevosFueraSeguidos: number;
}

/** Valores por defecto del relevo: los que preservan el comportamiento actual. */
export const CONFIG_RELEVO_POR_DEFECTO: ConfigRelevo = {
  costalerosPorTrabajadera: 1,
  maxRelevosFueraSeguidos: 2,
};

/** Contexto que una regla recibe para evaluar. */
export interface ContextoReglas {
  paso: Paso;
  plan: PlanDeRelevo;
  cuadrillas: Cuadrilla[];
  costaleros: Costalero[];
  /** Parámetros del relevo; si no se dan, rigen los valores por defecto. */
  config?: ConfigRelevo;
}

/**
 * Regla del motor. Añadir una regla nueva es registrarla en la lista activa:
 * el motor no se modifica.
 */
export interface Regla {
  id: string;
  severidad: Severidad;
  descripcion: string;
  evaluar(contexto: ContextoReglas): Hallazgo[];
}

/** Motor de reglas: evalúa el contexto y agrega los hallazgos de cada regla. */
export interface MotorReglas {
  evaluar(contexto: ContextoReglas): ResultadoValidacion;
}

/** Entrada del planificador de relevos. */
export interface EntradaPlan {
  paso: Paso;
  cuadrillas: Cuadrilla[];
  costaleros: Costalero[];
  puntos: PuntoDeRelevo[];
  /** Coste por costalero, en segundos (opcional). */
  costePorCostaleroSegundos?: number;
  /** Parámetros del relevo; si no se dan, rigen los valores por defecto. */
  config?: ConfigRelevo;
}
