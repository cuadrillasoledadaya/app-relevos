import { describe, expect, it } from 'vitest';

import { crearMotor } from '../../src/domain/motor';
import { crearPaso } from '../../src/domain/paso';
import type {
  ContextoReglas,
  Costalero,
  Paso,
  PlanDeRotacion,
  Regla,
  TramoPlanificado,
} from '../../src/domain/types';

const costaleros: Costalero[] = [
  {
    id: 'k1',
    nombre: 'Ana',
    cuadrillaId: 'c1',
    trabajaderaId: 'trab-paso-1-1',
    rol: 'patero-izquierdo',
    disponible: true,
  },
  {
    id: 'k2',
    nombre: 'Beto',
    cuadrillaId: 'c1',
    trabajaderaId: 'trab-paso-1-1',
    rol: 'patero-derecho',
    disponible: true,
  },
];

const paso: Paso = crearPaso({
  id: 'paso-1',
  nombre: 'Paso de prueba',
  cuadrillaId: 'c1',
  numeroTrabajaderas: 1,
});

function tramo(overrides: Partial<TramoPlanificado> = {}): TramoPlanificado {
  return {
    orden: 1,
    puntoId: 'p1',
    asignaciones: [
      { costaleroId: 'k1', trabajaderaId: 'trab-paso-1-1', puesto: 'patero-izquierdo' },
      { costaleroId: 'k2', trabajaderaId: 'trab-paso-1-1', puesto: 'patero-derecho' },
    ],
    ...overrides,
  };
}

function contextoDe(tramos: TramoPlanificado[]): ContextoReglas {
  const plan: PlanDeRotacion = { pasoId: paso.id, tramos };

  return { paso, plan, costaleros };
}

const reglaSinHallazgos: Regla = {
  id: 'REGLA_SIN_HALLAZGOS',
  severidad: 'error',
  descripcion: 'Regla que nunca encuentra nada.',
  evaluar: () => [],
};

const reglaConError: Regla = {
  id: 'REGLA_CON_ERROR',
  severidad: 'error',
  descripcion: 'Regla que siempre encuentra un error.',
  evaluar: () => [
    {
      reglaId: 'REGLA_CON_ERROR',
      severidad: 'error',
      mensaje: 'La regla de error se ha cumplido.',
    },
  ],
};

const reglaConAviso: Regla = {
  id: 'REGLA_CON_AVISO',
  severidad: 'warning',
  descripcion: 'Regla que siempre encuentra un aviso.',
  evaluar: () => [
    {
      reglaId: 'REGLA_CON_AVISO',
      severidad: 'error',
      mensaje: 'La regla de aviso solo informa.',
    },
  ],
};

describe('crearMotor', () => {
  it('is valid and free of findings when the context breaks no rule', () => {
    const resultado = crearMotor([reglaSinHallazgos]).evaluar(contextoDe([tramo()]));

    expect(resultado.hallazgos).toEqual([]);
    expect(resultado.valido).toBe(true);
  });

  it('is invalid when a rule reports an error finding', () => {
    const resultado = crearMotor([reglaConError]).evaluar(contextoDe([tramo()]));

    expect(resultado.valido).toBe(false);
    expect(resultado.hallazgos.some((hallazgo) => hallazgo.severidad === 'error')).toBe(true);
  });

  it('stays valid when the only finding is a warning', () => {
    const resultado = crearMotor([reglaConAviso]).evaluar(contextoDe([tramo()]));

    expect(resultado.valido).toBe(true);
    expect(resultado.hallazgos).toHaveLength(1);
    expect(resultado.hallazgos[0].reglaId).toBe('REGLA_CON_AVISO');
    expect(resultado.hallazgos[0].severidad).toBe('warning');
  });

  it('aggregates the findings of every rule that is broken', () => {
    const resultado = crearMotor([reglaConError, reglaConAviso]).evaluar(contextoDe([tramo()]));

    expect(resultado.valido).toBe(false);
    expect(resultado.hallazgos.map((hallazgo) => hallazgo.reglaId)).toEqual([
      'REGLA_CON_ERROR',
      'REGLA_CON_AVISO',
    ]);
  });

  it('evaluates a rule registered later without any change in the engine', () => {
    const motor = crearMotor([reglaSinHallazgos, reglaConError]);
    const resultado = motor.evaluar(contextoDe([tramo()]));

    expect(resultado.valido).toBe(false);
    expect(resultado.hallazgos.map((hallazgo) => hallazgo.reglaId)).toContain('REGLA_CON_ERROR');
  });

  it('applies the severity declared by the rule to its findings', () => {
    const resultado = crearMotor([reglaConAviso]).evaluar(contextoDe([tramo()]));

    expect(resultado.valido).toBe(true);
    expect(resultado.hallazgos[0].severidad).toBe('warning');
  });

  it('returns a valid empty result when there are no registered rules', () => {
    const resultado = crearMotor([]).evaluar(contextoDe([tramo()]));

    expect(resultado.hallazgos).toEqual([]);
    expect(resultado.valido).toBe(true);
  });
});
