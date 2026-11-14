import { describe, expect, it } from 'vitest';

import { crearMotor } from '../../src/domain/motor';
import { crearPaso } from '../../src/domain/paso';
import { REGLAS_V1 } from '../../src/domain/reglas';
import type {
  ContextoReglas,
  Costalero,
  Cuadrilla,
  Paso,
  PlanDeRelevo,
  Regla,
  RelevoPlanificado,
} from '../../src/domain/types';

const cuadrillas: Cuadrilla[] = [
  { id: 'c1', nombre: 'Cuadrilla Uno' },
  { id: 'c2', nombre: 'Cuadrilla Dos' },
];

const costaleros: Costalero[] = [
  { id: 'k1', nombre: 'Ana', cuadrillaId: 'c1', disponible: true },
  { id: 'k2', nombre: 'Beto', cuadrillaId: 'c1', disponible: true },
  { id: 'k3', nombre: 'Carla', cuadrillaId: 'c2', disponible: true },
  { id: 'k4', nombre: 'Dani', cuadrillaId: 'c2', disponible: true },
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

describe('crearMotor', () => {
  it('is valid and free of findings when the context breaks no rule', () => {
    const resultado = crearMotor(REGLAS_V1).evaluar(contextoDe([relevo()]));

    expect(resultado.hallazgos).toEqual([]);
    expect(resultado.valido).toBe(true);
  });

  it('is invalid when a rule reports an error finding', () => {
    const resultado = crearMotor(REGLAS_V1).evaluar(
      contextoDe([relevo({ cuadrillaEntranteId: '' })]),
    );

    expect(resultado.valido).toBe(false);
    expect(resultado.hallazgos.some((hallazgo) => hallazgo.severidad === 'error')).toBe(true);
  });

  it('stays valid when the only finding is a warning', () => {
    const resultado = crearMotor(REGLAS_V1).evaluar(
      contextoDe([
        relevo({ orden: 1, puntoId: 'p1', cuadrillaEntranteId: 'c1' }),
        relevo({
          orden: 2,
          puntoId: 'p1',
          cuadrillaEntranteId: 'c2',
          asignaciones: [
            { costaleroId: 'k3', trabajaderaId: 'trab-paso-1-1' },
            { costaleroId: 'k4', trabajaderaId: 'trab-paso-1-2' },
          ],
        }),
      ]),
    );

    expect(resultado.valido).toBe(true);
    expect(resultado.hallazgos).toHaveLength(1);
    expect(resultado.hallazgos[0].reglaId).toBe('PUNTO_DE_RELEVO_DUPLICADO');
    expect(resultado.hallazgos[0].severidad).toBe('warning');
  });

  it('aggregates the findings of every rule that is broken', () => {
    const resultado = crearMotor(REGLAS_V1).evaluar(
      contextoDe([
        relevo({
          puntoId: '',
          cuadrillaEntranteId: 'c1',
          asignaciones: [{ costaleroId: 'k3', trabajaderaId: 'trab-paso-1-1' }],
        }),
        relevo({
          orden: 2,
          puntoId: 'p2',
          cuadrillaEntranteId: 'c1',
          asignaciones: [
            { costaleroId: 'k1', trabajaderaId: 'trab-paso-1-1' },
            { costaleroId: 'k1', trabajaderaId: 'trab-paso-1-2' },
          ],
        }),
      ]),
    );

    expect(resultado.valido).toBe(false);
    expect(resultado.hallazgos.map((hallazgo) => hallazgo.reglaId)).toEqual([
      'RELEVO_SIN_PUNTO',
      'TRABAJADERA_SIN_CUBRIR',
      'COSTALERO_FUERA_DE_CUADRILLA',
      'COSTALERO_REPETIDO_EN_RELEVO',
      'CUADRILLA_RELEVA_DOS_VECES_SEGUIDO',
    ]);
  });

  it('evaluates a rule registered later without any change in the engine', () => {
    const reglaNueva: Regla = {
      id: 'REGLA_DE_PRUEBA',
      severidad: 'error',
      descripcion: 'Regla registrada despues del motor.',
      evaluar: () => [
        {
          reglaId: 'REGLA_DE_PRUEBA',
          severidad: 'error',
          mensaje: 'La regla de prueba se ha cumplido.',
        },
      ],
    };

    const motor = crearMotor([...REGLAS_V1, reglaNueva]);
    const resultado = motor.evaluar(contextoDe([relevo()]));

    expect(resultado.valido).toBe(false);
    expect(resultado.hallazgos.map((hallazgo) => hallazgo.reglaId)).toContain('REGLA_DE_PRUEBA');
  });

  it('applies the severity declared by the rule to its findings', () => {
    const reglaInformativa: Regla = {
      id: 'REGLA_INFORMATIVA',
      severidad: 'warning',
      descripcion: 'Regla informativa registrada despues del motor.',
      evaluar: () => [
        {
          reglaId: 'REGLA_INFORMATIVA',
          severidad: 'error',
          mensaje: 'La regla informativa solo informa.',
        },
      ],
    };

    const resultado = crearMotor([reglaInformativa]).evaluar(contextoDe([relevo()]));

    expect(resultado.valido).toBe(true);
    expect(resultado.hallazgos[0].severidad).toBe('warning');
  });

  it('returns a valid empty result when there are no registered rules', () => {
    const resultado = crearMotor([]).evaluar(contextoDe([relevo()]));

    expect(resultado.hallazgos).toEqual([]);
    expect(resultado.valido).toBe(true);
  });
});
