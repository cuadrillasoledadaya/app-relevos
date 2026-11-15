import { describe, expect, it } from 'vitest';

import {
  CODIGO_COSTALEROS_INSUFICIENTES,
  CODIGO_ROTACION_IMPOSIBLE,
  ErrorDeDominio,
  MENSAJE_COSTALEROS_INSUFICIENTES,
} from '../../src/domain/errors';
import { planificarRotacion } from '../../src/domain/planificador';
import { NIVEL_ROL, PUESTOS_TRABAJADERA } from '../../src/domain/types';
import type {
  Costalero,
  EntradaRotacion,
  Paso,
  PlanDeRotacion,
  PuntoDeRelevo,
  RolCostalero,
  Trabajadera,
} from '../../src/domain/types';

const CUADRILLA = 'cuadrilla-1';

function costalero(id: string, trabajaderaId: string, rol: RolCostalero = 'corriente'): Costalero {
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

function paso(trabajaderas: Trabajadera[]): Paso {
  return {
    id: 'paso-1',
    nombre: 'Paso de prueba',
    cuadrillaId: CUADRILLA,
    trabajaderas,
  };
}

/** Grupo de 6 costaleros: en 12 tramos sale uno por tramo, así que descansa dos veces cada uno. */
const GRUPO_A: Costalero[] = [
  costalero('a1', 'trab-paso-1-1', 'patero-izquierdo'),
  costalero('a2', 'trab-paso-1-1', 'patero-derecho'),
  costalero('a3', 'trab-paso-1-1', 'fijador-izquierdo'),
  costalero('a4', 'trab-paso-1-1', 'fijador-derecho'),
  costalero('a5', 'trab-paso-1-1', 'corriente'),
  costalero('a6', 'trab-paso-1-1', 'corriente'),
];

/** Grupo de 10 costaleros: cinco de nivel 1 y cinco de nivel 2, con los cinco minutos. */
const GRUPO_NIVELES: Costalero[] = [
  costalero('n1', 'trab-paso-1-1', 'corriente'),
  costalero('n2', 'trab-paso-1-1', 'corriente'),
  costalero('n3', 'trab-paso-1-1', 'corriente'),
  costalero('n4', 'trab-paso-1-1', 'corriente'),
  costalero('n5', 'trab-paso-1-1', 'corriente'),
  costalero('n6', 'trab-paso-1-1', 'fijador-izquierdo'),
  costalero('n7', 'trab-paso-1-1', 'fijador-derecho'),
  costalero('n8', 'trab-paso-1-1', 'fijador-izquierdo'),
  costalero('n9', 'trab-paso-1-1', 'fijador-derecho'),
  costalero('n10', 'trab-paso-1-1', 'corriente'),
];

function entradaBase(): EntradaRotacion {
  return {
    paso: paso([trabajadera(1, 12)]),
    costaleros: [...GRUPO_A],
  };
}

/** Identificadores de los costaleros que llevan el paso en un tramo de una trabajadera. */
function debajoDe(plan: PlanDeRotacion, orden: number, trabajaderaId: string): string[] {
  const tramo = plan.tramos.find((candidato) => candidato.orden === orden);

  return (tramo?.asignaciones ?? [])
    .filter((asignacion) => asignacion.trabajaderaId === trabajaderaId)
    .map((asignacion) => asignacion.costaleroId);
}

/** Número de tramos que cada costalero del grupo ha descansado. */
function descansosPorCostalero(
  plan: PlanDeRotacion,
  grupo: Costalero[],
  tramos: number,
): Map<string, number> {
  const descansos = new Map<string, number>(grupo.map((persona) => [persona.id, 0]));

  for (let orden = 1; orden <= tramos; orden += 1) {
    const debajo = new Set(debajoDe(plan, orden, grupo[0].trabajaderaId));

    for (const persona of grupo) {
      if (!debajo.has(persona.id)) {
        descansos.set(persona.id, (descansos.get(persona.id) ?? 0) + 1);
      }
    }
  }

  return descansos;
}

/** Racha más larga de tramos seguidos descansando de todo el grupo. */
function rachaMaximaFuera(plan: PlanDeRotacion, grupo: Costalero[], tramos: number): number {
  let maxima = 0;

  for (const persona of grupo) {
    let racha = 0;

    for (let orden = 1; orden <= tramos; orden += 1) {
      const debajo = new Set(debajoDe(plan, orden, persona.trabajaderaId));
      racha = debajo.has(persona.id) ? 0 : racha + 1;
      maxima = Math.max(maxima, racha);
    }
  }

  return maxima;
}

describe('planificarRotacion', () => {
  it('produces the same plan for the same input', () => {
    const entrada = entradaBase();

    expect(planificarRotacion(entrada)).toEqual(planificarRotacion(entrada));
  });

  it('does not depend on the order of the costaleros', () => {
    const entrada = entradaBase();
    const desordenada: EntradaRotacion = {
      ...entrada,
      costaleros: [...entrada.costaleros].reverse(),
    };

    expect(planificarRotacion(desordenada)).toEqual(planificarRotacion(entrada));
  });

  it('covers the five posts in every tramo', () => {
    const plan = planificarRotacion(entradaBase());

    expect(plan.tramos).toHaveLength(12);

    for (const tramo of plan.tramos) {
      const puestos = tramo.asignaciones.map((asignacion) => asignacion.puesto);
      expect([...puestos].sort()).toEqual([...PUESTOS_TRABAJADERA].sort());
    }
  });

  it('puts exactly K costaleros under the paso in every tramo', () => {
    const plan = planificarRotacion(entradaBase());

    for (const tramo of plan.tramos) {
      expect(tramo.asignaciones).toHaveLength(5);
    }
  });

  it('honours the configured number of costaleros under the paso', () => {
    const entrada: EntradaRotacion = {
      ...entradaBase(),
      config: { costalerosPorTrabajadera: 3, maxTramosFueraSeguidos: 2 },
    };
    const plan = planificarRotacion(entrada);

    for (const tramo of plan.tramos) {
      expect(tramo.asignaciones).toHaveLength(3);
    }
  });

  it('never leaves a costalero out more than M tramos in a row', () => {
    const plan = planificarRotacion(entradaBase());

    expect(rachaMaximaFuera(plan, GRUPO_A, 12)).toBeLessThanOrEqual(2);
  });

  it('gives the same number of outs to every costalero when the division is exact', () => {
    const plan = planificarRotacion(entradaBase());
    const descansos = [...descansosPorCostalero(plan, GRUPO_A, 12).values()];

    expect(new Set(descansos).size).toBe(1);
    expect(descansos[0]).toBe(2);
  });

  it('keeps the difference of outs within one when the division is not exact', () => {
    const grupo = [
      costalero('b1', 'trab-paso-1-1', 'patero-izquierdo'),
      costalero('b2', 'trab-paso-1-1', 'patero-derecho'),
      costalero('b3', 'trab-paso-1-1', 'fijador-izquierdo'),
      costalero('b4', 'trab-paso-1-1', 'fijador-derecho'),
      costalero('b5', 'trab-paso-1-1', 'corriente'),
      costalero('b6', 'trab-paso-1-1', 'corriente'),
      costalero('b7', 'trab-paso-1-1', 'corriente'),
    ];
    const plan = planificarRotacion({
      paso: paso([trabajadera(1, 12)]),
      costaleros: grupo,
    });
    const descansos = [...descansosPorCostalero(plan, grupo, 12).values()];

    expect(Math.max(...descansos) - Math.min(...descansos)).toBeLessThanOrEqual(1);
  });

  it('does not repeat the out of the first tramo in the last one', () => {
    const plan = planificarRotacion(entradaBase());
    const debajoEnElPrimero = new Set(debajoDe(plan, 1, 'trab-paso-1-1'));
    const debajoEnElUltimo = new Set(debajoDe(plan, 12, 'trab-paso-1-1'));

    for (const persona of GRUPO_A) {
      if (debajoEnElPrimero.has(persona.id)) {
        continue;
      }

      expect(debajoEnElUltimo.has(persona.id)).toBe(true);
    }
  });

  it('respects the hierarchy of heights', () => {
    const roles = new Map(GRUPO_NIVELES.map((persona) => [persona.id, persona.rol]));
    const plan = planificarRotacion({
      paso: paso([trabajadera(1, 12)]),
      costaleros: [...GRUPO_NIVELES],
    });

    for (const tramo of plan.tramos) {
      const deNivel1 = tramo.asignaciones.filter(
        (asignacion) => NIVEL_ROL[roles.get(asignacion.costaleroId) as RolCostalero] === 1,
      );
      const deNivel3 = tramo.asignaciones.filter(
        (asignacion) => NIVEL_ROL[roles.get(asignacion.costaleroId) as RolCostalero] === 3,
      );

      expect(deNivel1.length).toBeLessThanOrEqual(3);
      expect(deNivel3.length).toBeLessThanOrEqual(4);

      for (const asignacion of tramo.asignaciones) {
        const nivel = NIVEL_ROL[roles.get(asignacion.costaleroId) as RolCostalero];
        expect(Math.abs(nivel - NIVEL_ROL[asignacion.puesto])).toBeLessThanOrEqual(1);
      }
    }
  });

  it('reproduces the outs per costalero of the cuadrilla example', () => {
    const tamanos = [6, 7, 8, 9, 10, 8, 7];
    const roles: RolCostalero[] = [
      'patero-izquierdo',
      'patero-derecho',
      'fijador-izquierdo',
      'fijador-derecho',
      'corriente',
    ];
    const grupos: Costalero[][] = [];
    const costaleros: Costalero[] = [];

    tamanos.forEach((tamano, indice) => {
      const grupo = Array.from({ length: tamano }, (_, i) =>
        costalero(`t${indice + 1}c${i + 1}`, `trab-paso-1-${indice + 1}`, roles[i % roles.length]),
      );

      grupos.push(grupo);
      costaleros.push(...grupo);
    });

    const plan = planificarRotacion({
      paso: paso(tamanos.map((_, indice) => trabajadera(indice + 1, 12))),
      costaleros,
    });

    // Los numeros que la cuadrilla dejo en su ejemplo: 2, 3-4, 4-5, 5-6, 6, 4-5 y 3-4.
    const esperados = [
      [2, 2, 2, 2, 2, 2],
      [3, 3, 3, 3, 4, 4, 4],
      [4, 4, 4, 4, 5, 5, 5, 5],
      [5, 5, 5, 5, 5, 5, 6, 6, 6],
      [6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      [4, 4, 4, 4, 5, 5, 5, 5],
      [3, 3, 3, 3, 4, 4, 4],
    ];

    grupos.forEach((grupo, indice) => {
      const descansos = [...descansosPorCostalero(plan, grupo, 12).values()].sort((a, b) => a - b);
      expect(descansos).toEqual(esperados[indice]);
    });
  });

  it('does not rotate the working positions with fewer tramos', () => {
    const plan = planificarRotacion({
      paso: paso([trabajadera(1, 12), trabajadera(2, 6)]),
      costaleros: [
        ...GRUPO_A,
        ...GRUPO_NIVELES.map((persona) => ({
          ...persona,
          id: persona.id.replace('n', 'c'),
          trabajaderaId: 'trab-paso-1-2',
        })),
      ],
    });

    expect(plan.tramos).toHaveLength(12);

    for (const tramo of plan.tramos) {
      const deLaSegunda = tramo.asignaciones.filter(
        (asignacion) => asignacion.trabajaderaId === 'trab-paso-1-2',
      );

      if (tramo.orden <= 6) {
        expect(deLaSegunda).toHaveLength(5);
      } else {
        expect(deLaSegunda).toHaveLength(0);
      }
    }
  });

  it('takes the punto of each tramo by its order', () => {
    const puntos: PuntoDeRelevo[] = [
      { id: 'punto-1', nombre: 'Plaza mayor', orden: 1 },
      { id: 'punto-2', nombre: 'Calleón', orden: 2 },
    ];
    const plan = planificarRotacion({ ...entradaBase(), puntos });

    expect(plan.tramos[0].puntoId).toBe('punto-1');
    expect(plan.tramos[1].puntoId).toBe('punto-2');
    expect(plan.tramos[2].puntoId).toBe('tramo-3');
  });

  it('names the tramos when there are no puntos', () => {
    const plan = planificarRotacion(entradaBase());

    expect(plan.tramos[0].puntoId).toBe('tramo-1');
    expect(plan.tramos[11].puntoId).toBe('tramo-12');
  });

  it('never assigns a costalero who is not available', () => {
    const entrada = entradaBase();
    const conNoDisponible: EntradaRotacion = {
      ...entrada,
      costaleros: entrada.costaleros.map((persona) =>
        persona.id === 'a1' ? { ...persona, disponible: false } : persona,
      ),
    };
    const plan = planificarRotacion(conNoDisponible);

    for (const tramo of plan.tramos) {
      expect(tramo.asignaciones.some((asignacion) => asignacion.costaleroId === 'a1')).toBe(false);
      expect(tramo.asignaciones).toHaveLength(5);
    }
  });

  it('fails with the stable domain error when a working position has not enough costaleros', () => {
    let error: unknown;

    try {
      planificarRotacion({
        paso: paso([trabajadera(1, 12)]),
        costaleros: GRUPO_A.slice(0, 4),
      });
    } catch (capturado) {
      error = capturado;
    }

    expect(error).toBeInstanceOf(ErrorDeDominio);
    expect((error as ErrorDeDominio).codigo).toBe(CODIGO_COSTALEROS_INSUFICIENTES);
    expect((error as ErrorDeDominio).message).toBe(MENSAJE_COSTALEROS_INSUFICIENTES);
  });

  it('keeps the first tramo within the levels that fit under the paso', () => {
    // Quien descansa en el primer tramo vuelve a entrar en el último (R7): si
    // descansan más costaleros de un nivel de los que caben bajo el paso, el
    // último tramo no se puede cerrar.
    const plan = planificarRotacion({
      paso: paso([trabajadera(1, 12)]),
      costaleros: [...GRUPO_NIVELES],
    });

    const bajoEnElPrimero = new Set(debajoDe(plan, 1, 'trab-paso-1-1'));
    const descansanEnElPrimero = GRUPO_NIVELES.filter((persona) => !bajoEnElPrimero.has(persona.id));

    const deNivel1 = descansanEnElPrimero.filter((persona) => NIVEL_ROL[persona.rol] === 1);
    const deNivel3 = descansanEnElPrimero.filter((persona) => NIVEL_ROL[persona.rol] === 3);

    expect(deNivel1.length).toBeLessThanOrEqual(3);
    expect(deNivel3.length).toBeLessThanOrEqual(4);
  });

  it('fails with the stable domain error when the composition cannot respect the hierarchy', () => {
    const grupo = [
      ...Array.from({ length: 7 }, (_, indice) =>
        costalero(`r${indice + 1}`, 'trab-paso-1-1', 'corriente'),
      ),
      costalero('r8', 'trab-paso-1-1', 'fijador-izquierdo'),
    ];

    let error: unknown;

    try {
      planificarRotacion({ paso: paso([trabajadera(1, 12)]), costaleros: grupo });
    } catch (capturado) {
      error = capturado;
    }

    expect(error).toBeInstanceOf(ErrorDeDominio);
    expect((error as ErrorDeDominio).codigo).toBe(CODIGO_ROTACION_IMPOSIBLE);
  });
});
