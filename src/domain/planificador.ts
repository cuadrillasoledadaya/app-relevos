import type {
  AsignacionCostalero,
  Costalero,
  Cuadrilla,
  EntradaPlan,
  PlanDeRelevo,
  PuntoDeRelevo,
  RelevoPlanificado,
  Trabajadera,
} from './types';

/**
 * Generador de relevos de un paso.
 *
 * El plan es determinista: la misma entrada produce siempre el mismo plan.
 * No usa fechas, azar ni estado global; sólo los datos de la entrada.
 *
 * Reglas de planificación (S3):
 * - Un relevo por punto de relevo, ordenados por `PuntoDeRelevo.orden`.
 * - Cada relevo cubre todas las trabajaderas del paso con costaleros
 *   disponibles de la cuadrilla entrante.
 * - La misma cuadrilla no releva en dos relevos consecutivos.
 * - Si la cuadrilla no tiene costaleros suficientes, la trabajadera queda sin
 *   cubrir: el hueco no se oculta, lo detecta la regla `TRABAJADERA_SIN_CUBRIR`.
 *
 * `EntradaPlan.costePorCostaleroSegundos` es metadata opcional reservada para
 * optimizaciones futuras: el planificador v1 no optimiza por coste.
 */

/** Comparador de texto estable, independiente de la configuración regional. */
function compararTexto(anterior: string, actual: string): number {
  if (anterior < actual) {
    return -1;
  }

  if (anterior > actual) {
    return 1;
  }

  return 0;
}

/** Puntos de relevo ordenados por su orden a lo largo del recorrido. */
function ordenarPuntos(puntos: PuntoDeRelevo[]): PuntoDeRelevo[] {
  return [...puntos].sort((anterior, actual) => anterior.orden - actual.orden);
}

/** Trabajaderas ordenadas por su número dentro del paso. */
function ordenarTrabajaderas(trabajadoras: Trabajadera[]): Trabajadera[] {
  return [...trabajadoras].sort((anterior, actual) => anterior.numero - actual.numero);
}

/** Costaleros ordenados por identificador, para que la elección sea estable. */
function ordenarCostaleros(costaleros: Costalero[]): Costalero[] {
  return [...costaleros].sort((anterior, actual) => compararTexto(anterior.id, actual.id));
}

/**
 * Cuadrillas que pueden relevar, en el orden en que se reciben.
 *
 * Las cuadrillas marcadas como no disponibles se descartan. Si todas lo están,
 * se usan igualmente: es preferible un plan con huecos visibles por las reglas
 * que un plan vacío que esconde el problema.
 */
function elegirCuadrillas(cuadrillas: Cuadrilla[]): Cuadrilla[] {
  const disponibles = cuadrillas.filter((cuadrilla) => cuadrilla.disponible !== false);

  return disponibles.length > 0 ? disponibles : [...cuadrillas];
}

/**
 * Cuadrilla que entra en el siguiente relevo.
 *
 * Se recorre la lista de cuadrillas de forma circular, saltando la cuadrilla
 * que relevó en el relevo anterior. Si sólo hay una cuadrilla, se usa igualmente
 * y la repetición queda visible para la regla
 * `CUADRILLA_RELEVA_DOS_VECES_SEGUIDO`.
 */
function elegirCuadrillaEntrante(
  cuadrillas: Cuadrilla[],
  cursor: number,
  cuadrillaAnteriorId: string | undefined,
): { cuadrilla: Cuadrilla; cursor: number } {
  const total = cuadrillas.length;

  for (let desplazamiento = 0; desplazamiento < total; desplazamiento += 1) {
    const indice = (cursor + desplazamiento) % total;
    const candidata = cuadrillas[indice];

    if (cuadrillaAnteriorId === undefined || candidata.id !== cuadrillaAnteriorId) {
      return { cuadrilla: candidata, cursor: (indice + 1) % total };
    }
  }

  const indice = cursor % total;

  return { cuadrilla: cuadrillas[indice], cursor: (indice + 1) % total };
}

/**
 * Asigna un costalero disponible de la cuadrilla entrante a cada trabajadera.
 *
 * Las trabajaderas que se quedan sin costalero no se asignan a nadie: el hueco
 * queda en el plan y lo detectan las reglas.
 */
function asignarCostaleros(
  cuadrillaId: string,
  trabajadoras: Trabajadera[],
  costaleros: Costalero[],
): AsignacionCostalero[] {
  const asignaciones: AsignacionCostalero[] = [];
  const usados = new Set<string>();

  for (const trabajadora of trabajadoras) {
    const costalero = costaleros.find(
      (candidato) =>
        candidato.cuadrillaId === cuadrillaId &&
        candidato.disponible === true &&
        !usados.has(candidato.id),
    );

    if (costalero) {
      asignaciones.push({ costaleroId: costalero.id, trabajaderaId: trabajadora.id });
      usados.add(costalero.id);
    }
  }

  return asignaciones;
}

/**
 * Planifica los relevos de un paso.
 *
 * Devuelve un plan con un relevo por punto de relevo del recorrido, ordenado
 * por `PuntoDeRelevo.orden`, con todas las trabajaderas del paso cubiertas en
 * cada relevo.
 */
export function planificarRelevos(entrada: EntradaPlan): PlanDeRelevo {
  const puntos = ordenarPuntos(entrada.puntos);
  const trabajadoras = ordenarTrabajaderas(entrada.paso.trabajaderas);
  const cuadrillas = elegirCuadrillas(entrada.cuadrillas);
  const costaleros = ordenarCostaleros(entrada.costaleros);

  const relevos: RelevoPlanificado[] = [];

  if (cuadrillas.length === 0) {
    return { pasoId: entrada.paso.id, relevos };
  }

  let cursor = 0;
  let cuadrillaAnteriorId: string | undefined;
  let cuadrillaSalienteId = entrada.paso.cuadrillaId;

  for (const punto of puntos) {
    const eleccion = elegirCuadrillaEntrante(cuadrillas, cursor, cuadrillaAnteriorId);
    const asignaciones = asignarCostaleros(eleccion.cuadrilla.id, trabajadoras, costaleros);

    relevos.push({
      orden: relevos.length + 1,
      puntoId: punto.id,
      cuadrillaEntranteId: eleccion.cuadrilla.id,
      ...(cuadrillaSalienteId ? { cuadrillaSalienteId } : {}),
      asignaciones,
    });

    cursor = eleccion.cursor;
    cuadrillaAnteriorId = eleccion.cuadrilla.id;
    cuadrillaSalienteId = eleccion.cuadrilla.id;
  }

  return { pasoId: entrada.paso.id, relevos };
}
