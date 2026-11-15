import { describe, expect, it } from 'vitest';

import { crearMotor } from '../../src/domain/motor';
import { planificarRotacion } from '../../src/domain/planificador';
import { REGLAS_ACTUALES } from '../../src/domain/reglas';
import type {
  Costalero,
  EntradaRotacion,
  Paso,
  PlanDeRotacion,
  RolCostalero,
  Trabajadera,
} from '../../src/domain/types';

/**
 * Integración del dominio: el plan que genera el planificador tiene que
 * pasar el catálogo completo de reglas.
 *
 * La cuadrilla de ejemplo (L19): siete trabajaderas de 6 a 10 costaleros, con
 * los cinco puestos repartidos por rol y doce tramos de recorrido.
 */

const CUADRILLA = 'cuadrilla-1';

/** Roles en el orden en que los reparte la cuadrilla: los cinco puestos. */
const ROLES: RolCostalero[] = [
  'patero-izquierdo',
  'patero-derecho',
  'fijador-izquierdo',
  'fijador-derecho',
  'corriente',
];

/** Tamaños de las siete trabajaderas del ejemplo de la cuadrilla. */
const TAMANOS = [6, 7, 8, 9, 10, 8, 7];

/** Tramos del recorrido. */
const TRAMOS = 12;

function costalero(id: string, trabajaderaId: string, rol: RolCostalero): Costalero {
  return {
    id,
    nombre: id,
    cuadrillaId: CUADRILLA,
    trabajaderaId,
    rol,
    disponible: true,
  };
}

function trabajadera(numero: number, tramos: number): Trabajadera {
  return {
    id: `trab-paso-1-${numero}`,
    numero,
    lado: numero % 2 === 1 ? 'izquierda' : 'derecha',
    tramos,
  };
}

function pasoDeLaCuadrilla(): Paso {
  return {
    id: 'paso-1',
    nombre: 'Paso de la cuadrilla',
    cuadrillaId: CUADRILLA,
    trabajaderas: TAMANOS.map((_, indice) => trabajadera(indice + 1, TRAMOS)),
  };
}

function costalerosDeLaCuadrilla(): Costalero[] {
  const costaleros: Costalero[] = []

  TAMANOS.forEach((tamano, indice) => {
    for (let i = 0; i < tamano; i += 1) {
      costaleros.push(
        costalero(`t${indice + 1}c${i + 1}`, `trab-paso-1-${indice + 1}`, ROLES[i % ROLES.length]),
      );
    }
  });

  return costaleros;
}

function entrada(): EntradaRotacion {
  return { paso: pasoDeLaCuadrilla(), costaleros: costalerosDeLaCuadrilla() };
}

/** Evalúa el catálogo completo sobre el plan. */
function evaluar(plan: PlanDeRotacion, paso: Paso, costaleros: Costalero[]) {
  return crearMotor(REGLAS_ACTUALES).evaluar({ paso, plan, costaleros });
}

describe('el plan de la cuadrilla pasa el catálogo de reglas', () => {
  it('no deja ningún hallazgo de error', () => {
    const datos = entrada();
    const plan = planificarRotacion(datos);
    const resultado = evaluar(plan, datos.paso, datos.costaleros);

    expect(resultado.hallazgos.filter((hallazgo) => hallazgo.severidad === 'error')).toEqual([]);
    expect(resultado.valido).toBe(true);
  });

  it('reparte el descanso de cada trabajadera con exactitud', () => {
    const datos = entrada();
    const plan = planificarRotacion(datos);
    const resultado = evaluar(plan, datos.paso, datos.costaleros);

    // Con doce tramos y los tamaños de la cuadrilla, el reparto sale exacto:
    // la regla R4 no tiene por qué avisar de nada.
    expect(resultado.hallazgos.filter((hallazgo) => hallazgo.reglaId === 'DESCANSO_DESIGUAL')).toEqual(
      [],
    );
  });

  it('cubre los cinco puestos de cada trabajadera en cada tramo', () => {
    const datos = entrada();
    const plan = planificarRotacion(datos);

    for (const tramo of plan.tramos) {
      for (const trabajadera of datos.paso.trabajaderas) {
        const asignaciones = tramo.asignaciones.filter(
          (asignacion) => asignacion.trabajaderaId === trabajadera.id,
        );

        expect(asignaciones).toHaveLength(5);
      }
    }
  });

  it('nunca deja a nadie más de dos tramos seguidos descansando', () => {
    const datos = entrada();
    const plan = planificarRotacion(datos);

    for (const persona of datos.costaleros) {
      let racha = 0;
      let maxima = 0;

      for (const tramo of plan.tramos) {
        const asignado = tramo.asignaciones.some(
          (asignacion) => asignacion.costaleroId === persona.id,
        );

        racha = asignado ? 0 : racha + 1;
        maxima = Math.max(maxima, racha);
      }

      expect(maxima).toBeLessThanOrEqual(2);
    }
  });
});
