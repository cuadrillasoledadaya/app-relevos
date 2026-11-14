import { describe, expect, it } from 'vitest';

import { crearPaso } from '../../src/domain/paso';
import {
  COSTALERO_FUERA_DE_CUADRILLA,
  COSTALERO_NO_DISPONIBLE,
  COSTALERO_REPETIDO_EN_RELEVO,
  CUADRILLA_RELEVA_DOS_VECES_SEGUIDO,
  PUNTO_DE_RELEVO_DUPLICADO,
  REGLAS_V1,
  RELEVO_SIN_CUADRILLA_ENTRANTE,
  RELEVO_SIN_PUNTO,
  TRABAJADERA_SIN_CUBRIR,
} from '../../src/domain/reglas';
import type {
  ContextoReglas,
  Costalero,
  Cuadrilla,
  Paso,
  PlanDeRelevo,
  RelevoPlanificado,
} from '../../src/domain/types';

const cuadrillas: Cuadrilla[] = [
  { id: 'c1', nombre: 'Cuadrilla Uno' },
  { id: 'c2', nombre: 'Cuadrilla Dos' },
  { id: 'c3', nombre: 'Cuadrilla Tres' },
];

const costaleros: Costalero[] = [
  { id: 'k1', nombre: 'Ana', cuadrillaId: 'c1', disponible: true },
  { id: 'k2', nombre: 'Beto', cuadrillaId: 'c1', disponible: true },
  { id: 'k3', nombre: 'Carla', cuadrillaId: 'c2', disponible: true },
  { id: 'k4', nombre: 'Dani', cuadrillaId: 'c2', disponible: true },
  { id: 'k5', nombre: 'Eva', cuadrillaId: 'c3', disponible: true },
  { id: 'k6', nombre: 'Fran', cuadrillaId: 'c3', disponible: true },
  { id: 'k7', nombre: 'Gina', cuadrillaId: 'c3', disponible: false },
];

function crearPasoDePrueba(numeroTrabajaderas: number): Paso {
  const entrada = {
    id: 'paso-1',
    nombre: 'Paso de prueba',
    cuadrillaId: 'c1',
    numeroTrabajaderas,
  };

  return crearPaso(entrada);
}

const paso = crearPasoDePrueba(2);

function relevo(overrides: Partial<RelevoPlanificado> = {}): RelevoPlanificado {
  return {
    orden: 1,
    puntoId: 'p1',
    cuadrillaEntranteId: 'c1',
    asignaciones: [
      { costaleroId: 'k1', trabajaderaId: 'trab-paso-1-1' },
      { costaleroId: 'k2', trabajaderaId: 'trab-paso-1-2' },
    ],
    ...overrides,
  };
}

function contextoDe(relevos: RelevoPlanificado[]): ContextoReglas {
  const plan: PlanDeRelevo = { pasoId: paso.id, relevos };

  return { paso, plan, cuadrillas, costaleros };
}

describe('catalogo v1 de reglas', () => {
  it('registers exactly the eight structural rules of the catalogue', () => {
    expect(REGLAS_V1.map((regla) => regla.id)).toEqual([
      'RELEVO_SIN_CUADRILLA_ENTRANTE',
      'RELEVO_SIN_PUNTO',
      'TRABAJADERA_SIN_CUBRIR',
      'COSTALERO_FUERA_DE_CUADRILLA',
      'COSTALERO_NO_DISPONIBLE',
      'COSTALERO_REPETIDO_EN_RELEVO',
      'CUADRILLA_RELEVA_DOS_VECES_SEGUIDO',
      'PUNTO_DE_RELEVO_DUPLICADO',
    ]);
  });

  it('declares seven blocking rules and a single informative one', () => {
    expect(REGLAS_V1.filter((regla) => regla.severidad === 'error')).toHaveLength(7);
    expect(REGLAS_V1.filter((regla) => regla.severidad === 'warning')).toHaveLength(1);
    expect(PUNTO_DE_RELEVO_DUPLICADO.severidad).toBe('warning');
  });

  it('gives every rule a Spanish message', () => {
    for (const regla of REGLAS_V1) {
      expect(regla.mensaje.length).toBeGreaterThan(10);
      expect(regla.mensaje).not.toBe(regla.id);
    }
  });
});

describe('RELEVO_SIN_CUADRILLA_ENTRANTE', () => {
  it('reports a relief without a known incoming crew', () => {
    const hallazgos = RELEVO_SIN_CUADRILLA_ENTRANTE.evaluar(
      contextoDe([relevo({ cuadrillaEntranteId: '' })]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('RELEVO_SIN_CUADRILLA_ENTRANTE');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe('El relevo 1 no tiene una cuadrilla entrante válida.');
  });

  it('accepts a relief with a known incoming crew', () => {
    const hallazgos = RELEVO_SIN_CUADRILLA_ENTRANTE.evaluar(
      contextoDe([relevo({ cuadrillaEntranteId: 'c1' })]),
    );

    expect(hallazgos).toEqual([]);
  });
});

describe('RELEVO_SIN_PUNTO', () => {
  it('reports a relief without relief point', () => {
    const hallazgos = RELEVO_SIN_PUNTO.evaluar(contextoDe([relevo({ puntoId: '' })]));

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('RELEVO_SIN_PUNTO');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe('El relevo 1 no tiene punto de relevo.');
  });

  it('accepts a relief with relief point', () => {
    const hallazgos = RELEVO_SIN_PUNTO.evaluar(contextoDe([relevo({ puntoId: 'p1' })]));

    expect(hallazgos).toEqual([]);
  });
});

describe('TRABAJADERA_SIN_CUBRIR', () => {
  it('reports every working position left uncovered in a relief', () => {
    const hallazgos = TRABAJADERA_SIN_CUBRIR.evaluar(
      contextoDe([
        relevo({
          asignaciones: [{ costaleroId: 'k1', trabajaderaId: 'trab-paso-1-1' }],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('TRABAJADERA_SIN_CUBRIR');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe('El relevo 1 deja sin cubrir la trabajadera 2.');
  });

  it('accepts a relief that covers every working position of the step', () => {
    const hallazgos = TRABAJADERA_SIN_CUBRIR.evaluar(contextoDe([relevo()]));

    expect(hallazgos).toEqual([]);
  });
});

describe('COSTALERO_FUERA_DE_CUADRILLA', () => {
  it('reports a costalero assigned from another crew', () => {
    const hallazgos = COSTALERO_FUERA_DE_CUADRILLA.evaluar(
      contextoDe([
        relevo({
          asignaciones: [
            { costaleroId: 'k3', trabajaderaId: 'trab-paso-1-1' },
            { costaleroId: 'k2', trabajaderaId: 'trab-paso-1-2' },
          ],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('COSTALERO_FUERA_DE_CUADRILLA');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'El costalero k3 no pertenece a la cuadrilla c1 que releva en el relevo 1.',
    );
  });

  it('accepts a costalero of the incoming crew', () => {
    const hallazgos = COSTALERO_FUERA_DE_CUADRILLA.evaluar(contextoDe([relevo()]));

    expect(hallazgos).toEqual([]);
  });
});

describe('COSTALERO_NO_DISPONIBLE', () => {
  it('reports a costalero that is not available', () => {
    const hallazgos = COSTALERO_NO_DISPONIBLE.evaluar(
      contextoDe([
        relevo({
          cuadrillaEntranteId: 'c3',
          asignaciones: [
            { costaleroId: 'k7', trabajaderaId: 'trab-paso-1-1' },
            { costaleroId: 'k5', trabajaderaId: 'trab-paso-1-2' },
          ],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('COSTALERO_NO_DISPONIBLE');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe('El costalero k7 no está disponible para el relevo 1.');
  });

  it('accepts an available costalero', () => {
    const hallazgos = COSTALERO_NO_DISPONIBLE.evaluar(
      contextoDe([
        relevo({
          cuadrillaEntranteId: 'c3',
          asignaciones: [
            { costaleroId: 'k5', trabajaderaId: 'trab-paso-1-1' },
            { costaleroId: 'k6', trabajaderaId: 'trab-paso-1-2' },
          ],
        }),
      ]),
    );

    expect(hallazgos).toEqual([]);
  });
});

describe('COSTALERO_REPETIDO_EN_RELEVO', () => {
  it('reports a costalero assigned to two working positions in the same relief', () => {
    const hallazgos = COSTALERO_REPETIDO_EN_RELEVO.evaluar(
      contextoDe([
        relevo({
          asignaciones: [
            { costaleroId: 'k1', trabajaderaId: 'trab-paso-1-1' },
            { costaleroId: 'k1', trabajaderaId: 'trab-paso-1-2' },
          ],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('COSTALERO_REPETIDO_EN_RELEVO');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'El costalero k1 está asignado a varias trabajaderas en el relevo 1.',
    );
  });

  it('accepts different costaleros in every working position', () => {
    const hallazgos = COSTALERO_REPETIDO_EN_RELEVO.evaluar(contextoDe([relevo()]));

    expect(hallazgos).toEqual([]);
  });
});

describe('CUADRILLA_RELEVA_DOS_VECES_SEGUIDO', () => {
  it('reports a crew that takes two consecutive reliefs', () => {
    const hallazgos = CUADRILLA_RELEVA_DOS_VECES_SEGUIDO.evaluar(
      contextoDe([
        relevo({ orden: 1, cuadrillaEntranteId: 'c1' }),
        relevo({ orden: 2, cuadrillaEntranteId: 'c1' }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('CUADRILLA_RELEVA_DOS_VECES_SEGUIDO');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'La cuadrilla c1 releva en dos relevos consecutivos (1 y 2).',
    );
  });

  it('accepts a plan that alternates crews', () => {
    const hallazgos = CUADRILLA_RELEVA_DOS_VECES_SEGUIDO.evaluar(
      contextoDe([
        relevo({ orden: 1, cuadrillaEntranteId: 'c1' }),
        relevo({ orden: 2, cuadrillaEntranteId: 'c2' }),
      ]),
    );

    expect(hallazgos).toEqual([]);
  });
});

describe('PUNTO_DE_RELEVO_DUPLICADO', () => {
  it('reports a relief point used by two reliefs', () => {
    const hallazgos = PUNTO_DE_RELEVO_DUPLICADO.evaluar(
      contextoDe([
        relevo({ orden: 1, puntoId: 'p1', cuadrillaEntranteId: 'c1' }),
        relevo({ orden: 2, puntoId: 'p1', cuadrillaEntranteId: 'c2' }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('PUNTO_DE_RELEVO_DUPLICADO');
    expect(hallazgos[0].severidad).toBe('warning');
    expect(hallazgos[0].mensaje).toBe('El punto de relevo p1 se repite en los relevos 1 y 2.');
  });

  it('accepts a plan with one relief per relief point', () => {
    const hallazgos = PUNTO_DE_RELEVO_DUPLICADO.evaluar(
      contextoDe([
        relevo({ orden: 1, puntoId: 'p1', cuadrillaEntranteId: 'c1' }),
        relevo({ orden: 2, puntoId: 'p2', cuadrillaEntranteId: 'c2' }),
      ]),
    );

    expect(hallazgos).toEqual([]);
  });
});
