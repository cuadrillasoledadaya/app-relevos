import type { ContextoReglas, Hallazgo, Regla, RelevoPlanificado } from './types';

/**
 * Catálogo v1 de reglas de cambio de costaleros.
 *
 * Son invariantes estructurales del relevo, no reglas de negocio inventadas.
 * Cada regla tiene un identificador estable, una severidad y un mensaje en
 * español. El motor (`crearMotor`) no conoce estas reglas: el conjunto activo
 * es esta lista, que crece por registro.
 */

/** Regla del catálogo con su mensaje en español para la persona usuaria. */
export interface ReglaCatalogo extends Regla {
  /** Mensaje en español que enuncia la invariante que protege la regla. */
  mensaje: string;
}

/** Normaliza un texto que puede llegar ausente o vacío. */
function textoSeguro(valor: string | undefined): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/** Relevos del plan ordenados por su orden de secuencia. */
function relevosOrdenados(contexto: ContextoReglas): RelevoPlanificado[] {
  return [...contexto.plan.relevos].sort((anterior, actual) => anterior.orden - actual.orden);
}

/** Enumera números de forma natural: `1 y 2`, `1, 2 y 3`. */
function enumerar(numeros: number[]): string {
  if (numeros.length <= 1) {
    return numeros.join('');
  }

  const ultimo = numeros[numeros.length - 1];
  const anteriores = numeros.slice(0, numeros.length - 1);

  return `${anteriores.join(', ')} y ${ultimo}`;
}

/**
 * Todo relevo debe contar con una cuadrilla entrante válida.
 */
export const RELEVO_SIN_CUADRILLA_ENTRANTE: ReglaCatalogo = {
  id: 'RELEVO_SIN_CUADRILLA_ENTRANTE',
  severidad: 'error',
  descripcion: 'El relevo debe apuntar a una cuadrilla entrante existente.',
  mensaje: 'Todo relevo debe contar con una cuadrilla entrante válida.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    for (const relevo of contexto.plan.relevos) {
      const existe = contexto.cuadrillas.some(
        (cuadrilla) => cuadrilla.id === relevo.cuadrillaEntranteId,
      );

      if (!existe) {
        hallazgos.push({
          reglaId: RELEVO_SIN_CUADRILLA_ENTRANTE.id,
          severidad: 'error',
          mensaje: `El relevo ${relevo.orden} no tiene una cuadrilla entrante válida.`,
          contexto: {
            orden: relevo.orden,
            cuadrillaEntranteId: relevo.cuadrillaEntranteId,
          },
        });
      }
    }

    return hallazgos;
  },
};

/**
 * Todo relevo debe indicar el punto del recorrido donde se produce.
 */
export const RELEVO_SIN_PUNTO: ReglaCatalogo = {
  id: 'RELEVO_SIN_PUNTO',
  severidad: 'error',
  descripcion: 'El relevo debe indicar el punto del recorrido donde se produce.',
  mensaje: 'Todo relevo debe indicar su punto de relevo.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    for (const relevo of contexto.plan.relevos) {
      if (textoSeguro(relevo.puntoId) === '') {
        hallazgos.push({
          reglaId: RELEVO_SIN_PUNTO.id,
          severidad: 'error',
          mensaje: `El relevo ${relevo.orden} no tiene punto de relevo.`,
          contexto: { orden: relevo.orden },
        });
      }
    }

    return hallazgos;
  },
};

/**
 * Todas las trabajaderas del paso deben quedar cubiertas en cada relevo.
 */
export const TRABAJADERA_SIN_CUBRIR: ReglaCatalogo = {
  id: 'TRABAJADERA_SIN_CUBRIR',
  severidad: 'error',
  descripcion: 'Cada trabajadera del paso debe estar ocupada en todo relevo.',
  mensaje: 'Todas las trabajaderas del paso deben quedar cubiertas en cada relevo.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];
    const trabajadoras = [...contexto.paso.trabajaderas].sort(
      (anterior, actual) => anterior.numero - actual.numero,
    );

    for (const relevo of contexto.plan.relevos) {
      const cubiertas = new Set(relevo.asignaciones.map((asignacion) => asignacion.trabajaderaId));

      for (const trabajadora of trabajadoras) {
        if (!cubiertas.has(trabajadora.id)) {
          hallazgos.push({
            reglaId: TRABAJADERA_SIN_CUBRIR.id,
            severidad: 'error',
            mensaje: `El relevo ${relevo.orden} deja sin cubrir la trabajadera ${trabajadora.numero}.`,
            contexto: {
              orden: relevo.orden,
              trabajaderaId: trabajadora.id,
              trabajaderaNumero: trabajadora.numero,
            },
          });
        }
      }
    }

    return hallazgos;
  },
};

/**
 * Sólo se pueden asignar costaleros de la cuadrilla que releva.
 */
export const COSTALERO_FUERA_DE_CUADRILLA: ReglaCatalogo = {
  id: 'COSTALERO_FUERA_DE_CUADRILLA',
  severidad: 'error',
  descripcion: 'Sólo se asignan costaleros de la cuadrilla que releva.',
  mensaje: 'Sólo se pueden asignar costaleros de la cuadrilla entrante.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    for (const relevo of contexto.plan.relevos) {
      for (const asignacion of relevo.asignaciones) {
        const costalero = contexto.costaleros.find(
          (candidato) => candidato.id === asignacion.costaleroId,
        );

        if (!costalero || costalero.cuadrillaId !== relevo.cuadrillaEntranteId) {
          hallazgos.push({
            reglaId: COSTALERO_FUERA_DE_CUADRILLA.id,
            severidad: 'error',
            mensaje: `El costalero ${asignacion.costaleroId} no pertenece a la cuadrilla ${relevo.cuadrillaEntranteId} que releva en el relevo ${relevo.orden}.`,
            contexto: {
              orden: relevo.orden,
              costaleroId: asignacion.costaleroId,
              cuadrillaEntranteId: relevo.cuadrillaEntranteId,
            },
          });
        }
      }
    }

    return hallazgos;
  },
};

/**
 * No se pueden asignar costaleros que no estén disponibles.
 */
export const COSTALERO_NO_DISPONIBLE: ReglaCatalogo = {
  id: 'COSTALERO_NO_DISPONIBLE',
  severidad: 'error',
  descripcion: 'No se asignan costaleros marcados como no disponibles.',
  mensaje: 'No se pueden asignar costaleros que no estén disponibles.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    for (const relevo of contexto.plan.relevos) {
      for (const asignacion of relevo.asignaciones) {
        const costalero = contexto.costaleros.find(
          (candidato) => candidato.id === asignacion.costaleroId,
        );

        if (costalero && costalero.disponible !== true) {
          hallazgos.push({
            reglaId: COSTALERO_NO_DISPONIBLE.id,
            severidad: 'error',
            mensaje: `El costalero ${asignacion.costaleroId} no está disponible para el relevo ${relevo.orden}.`,
            contexto: {
              orden: relevo.orden,
              costaleroId: asignacion.costaleroId,
            },
          });
        }
      }
    }

    return hallazgos;
  },
};

/**
 * Un costalero no puede ocupar dos trabajaderas en el mismo relevo.
 */
export const COSTALERO_REPETIDO_EN_RELEVO: ReglaCatalogo = {
  id: 'COSTALERO_REPETIDO_EN_RELEVO',
  severidad: 'error',
  descripcion: 'Un costalero ocupa una sola trabajadera por relevo.',
  mensaje: 'Un costalero no puede ocupar dos trabajaderas en el mismo relevo.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    for (const relevo of contexto.plan.relevos) {
      const apariciones = new Map<string, number>();

      for (const asignacion of relevo.asignaciones) {
        apariciones.set(
          asignacion.costaleroId,
          (apariciones.get(asignacion.costaleroId) ?? 0) + 1,
        );
      }

      for (const [costaleroId, veces] of apariciones) {
        if (veces > 1) {
          hallazgos.push({
            reglaId: COSTALERO_REPETIDO_EN_RELEVO.id,
            severidad: 'error',
            mensaje: `El costalero ${costaleroId} está asignado a varias trabajaderas en el relevo ${relevo.orden}.`,
            contexto: {
              orden: relevo.orden,
              costaleroId,
              veces,
            },
          });
        }
      }
    }

    return hallazgos;
  },
};

/**
 * Una cuadrilla no puede relevar en dos relevos consecutivos.
 */
export const CUADRILLA_RELEVA_DOS_VECES_SEGUIDO: ReglaCatalogo = {
  id: 'CUADRILLA_RELEVA_DOS_VECES_SEGUIDO',
  severidad: 'error',
  descripcion: 'La cuadrilla entrante debe alternarse entre relevos consecutivos.',
  mensaje: 'Una cuadrilla no puede relevar en dos relevos consecutivos.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];
    const relevos = relevosOrdenados(contexto);

    for (let indice = 1; indice < relevos.length; indice += 1) {
      const anterior = relevos[indice - 1];
      const actual = relevos[indice];

      if (actual.cuadrillaEntranteId === anterior.cuadrillaEntranteId) {
        hallazgos.push({
          reglaId: CUADRILLA_RELEVA_DOS_VECES_SEGUIDO.id,
          severidad: 'error',
          mensaje: `La cuadrilla ${actual.cuadrillaEntranteId} releva en dos relevos consecutivos (${anterior.orden} y ${actual.orden}).`,
          contexto: {
            cuadrillaId: actual.cuadrillaEntranteId,
            ordenAnterior: anterior.orden,
            orden: actual.orden,
          },
        });
      }
    }

    return hallazgos;
  },
};

/**
 * No se puede repetir el punto de relevo dentro de un mismo plan.
 */
export const PUNTO_DE_RELEVO_DUPLICADO: ReglaCatalogo = {
  id: 'PUNTO_DE_RELEVO_DUPLICADO',
  severidad: 'warning',
  descripcion: 'Cada punto del recorrido aparece en un solo relevo del plan.',
  mensaje: 'No se puede repetir el punto de relevo dentro de un mismo plan.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];
    const relevosPorPunto = new Map<string, number[]>();

    for (const relevo of relevosOrdenados(contexto)) {
      const puntoId = textoSeguro(relevo.puntoId);

      if (puntoId === '') {
        continue;
      }

      const ordenes = relevosPorPunto.get(puntoId) ?? [];
      ordenes.push(relevo.orden);
      relevosPorPunto.set(puntoId, ordenes);
    }

    for (const [puntoId, ordenes] of relevosPorPunto) {
      if (ordenes.length > 1) {
        hallazgos.push({
          reglaId: PUNTO_DE_RELEVO_DUPLICADO.id,
          severidad: 'warning',
          mensaje: `El punto de relevo ${puntoId} se repite en los relevos ${enumerar(ordenes)}.`,
          contexto: { puntoId, ordenes },
        });
      }
    }

    return hallazgos;
  },
};

/**
 * Conjunto activo de reglas v1.
 *
 * Es el punto de registro: una regla nueva se añade a esta lista (o se
 * registra en otra lista que se pase a `crearMotor`) sin tocar el motor.
 */
export const REGLAS_V1: ReglaCatalogo[] = [
  RELEVO_SIN_CUADRILLA_ENTRANTE,
  RELEVO_SIN_PUNTO,
  TRABAJADERA_SIN_CUBRIR,
  COSTALERO_FUERA_DE_CUADRILLA,
  COSTALERO_NO_DISPONIBLE,
  COSTALERO_REPETIDO_EN_RELEVO,
  CUADRILLA_RELEVA_DOS_VECES_SEGUIDO,
  PUNTO_DE_RELEVO_DUPLICADO,
];
