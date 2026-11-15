import { describe, expect, it } from 'vitest';

import { crearMotor } from '../../src/domain/motor';
import { crearPaso } from '../../src/domain/paso';
import {
  COSTALEROS_POR_TRABAJADERA,
  COSTALERO_FUERA_DE_TRABAJADERA,
  COSTALERO_FUERA_DEMASIADO_TIEMPO,
  COSTALERO_NO_DISPONIBLE,
  COSTALERO_REPETIDO_EN_TRAMO,
  DESCANSO_DESIGUAL,
  FIJACION_NO_CUMPLIDA,
  FUERA_EN_PRIMERO_Y_ULTIMO,
  PUESTOS_MAL_CUBIERTOS,
  PUNTO_DE_RELEVO_DUPLICADO,
  REGLAS_ACTUALES,
  REGLAS_V2,
  TRABAJADERA_SIN_CUBRIR,
  TRAMO_SIN_PUNTO,
} from '../../src/domain/reglas';
import { PUESTOS_TRABAJADERA } from '../../src/domain/types';
import type {
  AsignacionCostalero,
  ConfigRotacion,
  ContextoReglas,
  Costalero,
  FijacionCostalero,
  Paso,
  PlanDeRotacion,
  TramoPlanificado,
} from '../../src/domain/types';

const TRABAJADORA_1 = 'trab-paso-1-1';
const TRABAJADORA_2 = 'trab-paso-1-2';

const paso = crearPaso({
  id: 'paso-1',
  nombre: 'Paso de prueba',
  cuadrillaId: 'c1',
  numeroTrabajaderas: 2,
  tramosPorTrabajadera: 4,
});

/** Paso cuya segunda trabajadera rota sólo dos tramos. */
const pasoConSegundaCorta: Paso = {
  ...paso,
  trabajaderas: paso.trabajaderas.map((trabajadera) =>
    trabajadera.id === TRABAJADORA_2 ? { ...trabajadera, tramos: 2 } : trabajadera,
  ),
};

/** Paso cuya primera trabajadera rota sólo dos tramos. */
const pasoConPrimeraCorta: Paso = {
  ...paso,
  trabajaderas: paso.trabajaderas.map((trabajadera) =>
    trabajadera.id === TRABAJADORA_1 ? { ...trabajadera, tramos: 2 } : trabajadera,
  ),
};

const costaleros: Costalero[] = [
  {
    id: 'k1',
    nombre: 'Ana',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_1,
    rol: 'patero-izquierdo',
    disponible: true,
  },
  {
    id: 'k2',
    nombre: 'Beto',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_1,
    rol: 'patero-derecho',
    disponible: true,
  },
  {
    id: 'k3',
    nombre: 'Carla',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_1,
    rol: 'fijador-izquierdo',
    disponible: true,
  },
  {
    id: 'k4',
    nombre: 'Dani',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_1,
    rol: 'fijador-derecho',
    disponible: true,
  },
  {
    id: 'k5',
    nombre: 'Eva',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_1,
    rol: 'corriente',
    disponible: true,
  },
  {
    id: 'k6',
    nombre: 'Fran',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_1,
    rol: 'corriente',
    disponible: true,
  },
  {
    id: 'k7',
    nombre: 'Gina',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_2,
    rol: 'patero-izquierdo',
    disponible: true,
  },
  {
    id: 'k8',
    nombre: 'Hugo',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_2,
    rol: 'patero-derecho',
    disponible: true,
  },
  {
    id: 'k9',
    nombre: 'Irene',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_2,
    rol: 'fijador-izquierdo',
    disponible: true,
  },
  {
    id: 'k10',
    nombre: 'Julián',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_2,
    rol: 'fijador-derecho',
    disponible: true,
  },
  {
    id: 'k11',
    nombre: 'Lucía',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_2,
    rol: 'corriente',
    disponible: true,
  },
  {
    id: 'k12',
    nombre: 'Manu',
    cuadrillaId: 'c1',
    trabajaderaId: TRABAJADORA_2,
    rol: 'corriente',
    disponible: true,
  },
];

/** Asignaciones de una trabajadera, con los puestos en el orden de la cuadrilla. */
function asignaciones(trabajaderaId: string, costaleroIds: string[]): AsignacionCostalero[] {
  return costaleroIds.map((costaleroId, indice) => ({
    costaleroId,
    trabajaderaId,
    puesto: PUESTOS_TRABAJADERA[Math.min(indice, PUESTOS_TRABAJADERA.length - 1)],
  }));
}

/** Los cinco costaleros de la primera trabajadera, con los cinco puestos. */
const BAJO_1 = asignaciones(TRABAJADORA_1, ['k1', 'k2', 'k3', 'k4', 'k5']);

/** Los cinco costaleros de la segunda trabajadera, con los cinco puestos. */
const BAJO_2 = asignaciones(TRABAJADORA_2, ['k7', 'k8', 'k9', 'k10', 'k11']);

function tramo(overrides: Partial<TramoPlanificado> = {}): TramoPlanificado {
  return {
    orden: 1,
    puntoId: 'p1',
    asignaciones: [...BAJO_1, ...BAJO_2],
    ...overrides,
  };
}

interface OpcionesContexto {
  paso?: Paso;
  costaleros?: Costalero[];
  config?: ConfigRotacion;
  fijaciones?: FijacionCostalero[];
}

function contextoDe(
  tramos: TramoPlanificado[],
  opciones: OpcionesContexto = {},
): ContextoReglas {
  const plan: PlanDeRotacion = { pasoId: 'paso-1', tramos };

  return {
    paso: opciones.paso ?? paso,
    plan,
    costaleros: opciones.costaleros ?? costaleros,
    ...(opciones.config === undefined ? {} : { config: opciones.config }),
    ...(opciones.fijaciones === undefined ? {} : { fijaciones: opciones.fijaciones }),
  };
}

describe('catalogo v2 de reglas', () => {
  it('registers exactly the twelve rules of the working position model', () => {
    expect(REGLAS_V2.map((regla) => regla.id)).toEqual([
      'TRAMO_SIN_PUNTO',
      'PUNTO_DE_RELEVO_DUPLICADO',
      'TRABAJADERA_SIN_CUBRIR',
      'COSTALEROS_POR_TRABAJADERA',
      'COSTALERO_FUERA_DE_TRABAJADERA',
      'COSTALERO_NO_DISPONIBLE',
      'COSTALERO_REPETIDO_EN_TRAMO',
      'COSTALERO_FUERA_DEMASIADO_TIEMPO',
      'DESCANSO_DESIGUAL',
      'FUERA_EN_PRIMERO_Y_ULTIMO',
      'PUESTOS_MAL_CUBIERTOS',
      'FIJACION_NO_CUMPLIDA',
    ]);
  });

  it('declares ten blocking rules and two informative ones', () => {
    expect(REGLAS_V2.filter((regla) => regla.severidad === 'error')).toHaveLength(10);
    expect(REGLAS_V2.filter((regla) => regla.severidad === 'warning')).toHaveLength(2);
    expect(PUNTO_DE_RELEVO_DUPLICADO.severidad).toBe('warning');
    expect(DESCANSO_DESIGUAL.severidad).toBe('warning');
  });

  it('gives every rule a Spanish message', () => {
    for (const regla of REGLAS_V2) {
      expect(regla.mensaje.length).toBeGreaterThan(10);
      expect(regla.mensaje).not.toBe(regla.id);
    }
  });

  it('drops the rules of the relief by cuadrilla model', () => {
    const identificadores = REGLAS_ACTUALES.map((regla) => regla.id);

    expect(identificadores).toEqual(REGLAS_V2.map((regla) => regla.id));
    expect(identificadores).not.toContain('RELEVO_SIN_CUADRILLA_ENTRANTE');
    expect(identificadores).not.toContain('CUADRILLA_RELEVA_DOS_VECES_SEGUIDO');
    expect(identificadores).not.toContain('COSTALERO_FUERA_DE_CUADRILLA');
    expect(identificadores).not.toContain('RELEVO_SIN_PUNTO');
    expect(identificadores).not.toContain('COSTALERO_REPETIDO_EN_RELEVO');
  });
});

describe('TRAMO_SIN_PUNTO', () => {
  it('reports a tramo without a point of the route', () => {
    const hallazgos = TRAMO_SIN_PUNTO.evaluar(contextoDe([tramo({ puntoId: '' })]));

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('TRAMO_SIN_PUNTO');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe('El tramo 1 no tiene punto del recorrido.');
  });

  it('accepts a tramo with a point of the route', () => {
    const hallazgos = TRAMO_SIN_PUNTO.evaluar(contextoDe([tramo()]));

    expect(hallazgos).toEqual([]);
  });
});

describe('PUNTO_DE_RELEVO_DUPLICADO', () => {
  it('reports a route point shared by two tramos', () => {
    const hallazgos = PUNTO_DE_RELEVO_DUPLICADO.evaluar(
      contextoDe([tramo({ orden: 1, puntoId: 'p1' }), tramo({ orden: 2, puntoId: 'p1' })]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('PUNTO_DE_RELEVO_DUPLICADO');
    expect(hallazgos[0].severidad).toBe('warning');
    expect(hallazgos[0].mensaje).toBe('El punto del recorrido p1 se repite en los tramos 1 y 2.');
  });

  it('accepts one route point per tramo', () => {
    const hallazgos = PUNTO_DE_RELEVO_DUPLICADO.evaluar(
      contextoDe([tramo({ orden: 1, puntoId: 'p1' }), tramo({ orden: 2, puntoId: 'p2' })]),
    );

    expect(hallazgos).toEqual([]);
  });
});

describe('TRABAJADERA_SIN_CUBRIR', () => {
  it('reports a working position left without anyone under the paso', () => {
    const hallazgos = TRABAJADERA_SIN_CUBRIR.evaluar(
      contextoDe([tramo({ asignaciones: [...BAJO_2] })]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('TRABAJADERA_SIN_CUBRIR');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe('El tramo 1 deja sin cubrir la trabajadera 1.');
  });

  it('accepts a tramo that covers every applicable working position', () => {
    const hallazgos = TRABAJADERA_SIN_CUBRIR.evaluar(contextoDe([tramo()]));

    expect(hallazgos).toEqual([]);
  });

  it('does not demand coverage in the tramos a working position does not rotate', () => {
    const hallazgos = TRABAJADERA_SIN_CUBRIR.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1' }),
          tramo({ orden: 2, puntoId: 'p2' }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: [...BAJO_1] }),
        ],
        { paso: pasoConSegundaCorta },
      ),
    );

    expect(hallazgos).toEqual([]);
  });
});

describe('COSTALEROS_POR_TRABAJADERA', () => {
  it('reports a working position with a different number of costaleros', () => {
    const hallazgos = COSTALEROS_POR_TRABAJADERA.evaluar(
      contextoDe([
        tramo({ asignaciones: [...asignaciones(TRABAJADORA_1, ['k1', 'k2', 'k3', 'k4']), ...BAJO_2] }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('COSTALEROS_POR_TRABAJADERA');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'La cantidad de costaleros asignados a la trabajadera 1 en el tramo 1 es 4; se esperan 5.',
    );
    expect(hallazgos[0].contexto).toEqual({
      orden: 1,
      trabajaderaId: TRABAJADORA_1,
      trabajaderaNumero: 1,
      conteo: 4,
      esperado: 5,
    });
  });

  it('accepts the default of five costaleros under each working position', () => {
    const hallazgos = COSTALEROS_POR_TRABAJADERA.evaluar(contextoDe([tramo()]));

    expect(hallazgos).toEqual([]);
  });

  it('does not demand coverage in the tramos a working position does not rotate', () => {
    const hallazgos = COSTALEROS_POR_TRABAJADERA.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1' }),
          tramo({ orden: 2, puntoId: 'p2' }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: [...BAJO_1] }),
        ],
        { paso: pasoConSegundaCorta },
      ),
    );

    expect(hallazgos).toEqual([]);
  });
});

describe('COSTALERO_FUERA_DE_TRABAJADERA', () => {
  it('reports a costalero assigned to a working position that is not his', () => {
    const hallazgos = COSTALERO_FUERA_DE_TRABAJADERA.evaluar(
      contextoDe([
        tramo({
          asignaciones: [...asignaciones(TRABAJADORA_1, ['k7', 'k2', 'k3', 'k4', 'k5']), ...BAJO_2],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('COSTALERO_FUERA_DE_TRABAJADERA');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'El costalero k7 no pertenece a la trabajadera trab-paso-1-1 en la que se le asigna en el tramo 1.',
    );
  });

  it('accepts a costalero assigned to his own working position', () => {
    const hallazgos = COSTALERO_FUERA_DE_TRABAJADERA.evaluar(contextoDe([tramo()]));

    expect(hallazgos).toEqual([]);
  });
});

describe('COSTALERO_NO_DISPONIBLE', () => {
  it('reports a costalero that is not available', () => {
    const noDisponible: Costalero = {
      id: 'k13',
      nombre: 'Nuria',
      cuadrillaId: 'c1',
      trabajaderaId: TRABAJADORA_1,
      rol: 'corriente',
      disponible: false,
    };

    const hallazgos = COSTALERO_NO_DISPONIBLE.evaluar(
      contextoDe(
        [
          tramo({
            asignaciones: [
              ...asignaciones(TRABAJADORA_1, ['k13', 'k2', 'k3', 'k4', 'k5']),
              ...BAJO_2,
            ],
          }),
        ],
        { costaleros: [...costaleros, noDisponible] },
      ),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('COSTALERO_NO_DISPONIBLE');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe('El costalero k13 no está disponible para el tramo 1.');
  });

  it('accepts an available costalero', () => {
    const hallazgos = COSTALERO_NO_DISPONIBLE.evaluar(contextoDe([tramo()]));

    expect(hallazgos).toEqual([]);
  });
});

describe('COSTALERO_REPETIDO_EN_TRAMO', () => {
  it('reports a costalero assigned twice in the same tramo', () => {
    const hallazgos = COSTALERO_REPETIDO_EN_TRAMO.evaluar(
      contextoDe([
        tramo({
          asignaciones: [...asignaciones(TRABAJADORA_1, ['k1', 'k1', 'k3', 'k4', 'k5']), ...BAJO_2],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('COSTALERO_REPETIDO_EN_TRAMO');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe('El costalero k1 aparece 2 veces en el tramo 1.');
  });

  it('accepts different costaleros in the same tramo', () => {
    const hallazgos = COSTALERO_REPETIDO_EN_TRAMO.evaluar(contextoDe([tramo()]));

    expect(hallazgos).toEqual([]);
  });
});

describe('COSTALERO_FUERA_DEMASIADO_TIEMPO', () => {
  it('reports a costalero outside for more consecutive tramos than allowed', () => {
    const hallazgos = COSTALERO_FUERA_DEMASIADO_TIEMPO.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: [] }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: [] }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: [] }),
        ],
        { costaleros: [costaleros[0]] },
      ),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('COSTALERO_FUERA_DEMASIADO_TIEMPO');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'El costalero k1 pasa 3 tramos seguidos sin asignación; el máximo permitido es 2.',
    );
    expect(hallazgos[0].contexto).toEqual({ costaleroId: 'k1', racha: 3, maximo: 2 });
  });

  it('accepts a gap within the default maximum of consecutive tramos outside', () => {
    const hallazgos = COSTALERO_FUERA_DEMASIADO_TIEMPO.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: [] }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: [] }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
        ],
        { costaleros: [costaleros[0]] },
      ),
    );

    expect(hallazgos).toEqual([]);
  });

  it('cuts the streak in the tramos a working position does not rotate', () => {
    const hallazgos = COSTALERO_FUERA_DEMASIADO_TIEMPO.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: [] }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: [] }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: [] }),
        ],
        { paso: pasoConPrimeraCorta, costaleros: [costaleros[0]] },
      ),
    );

    expect(hallazgos).toEqual([]);
  });
});

describe('DESCANSO_DESIGUAL', () => {
  const configConUnoBajo: ConfigRotacion = {
    costalerosPorTrabajadera: 1,
    maxTramosFueraSeguidos: 2,
  };

  it('reports a working position whose rest is not evenly shared when the split is exact', () => {
    const hallazgos = DESCANSO_DESIGUAL.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
        ],
        { costaleros: costaleros.slice(0, 2), config: configConUnoBajo },
      ),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('DESCANSO_DESIGUAL');
    expect(hallazgos[0].severidad).toBe('warning');
    expect(hallazgos[0].mensaje).toBe(
      'La trabajadera 1 tiene un reparto de descanso desigual: el mínimo es 0 tramos sin asignación y el máximo es 4.',
    );
    expect(hallazgos[0].contexto).toEqual({
      trabajaderaId: TRABAJADORA_1,
      trabajaderaNumero: 1,
      minimo: 0,
      maximo: 4,
      tolerancia: 0,
    });
  });

  it('accepts an exact split of the rest', () => {
    const hallazgos = DESCANSO_DESIGUAL.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: asignaciones(TRABAJADORA_1, ['k2']) }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: asignaciones(TRABAJADORA_1, ['k2']) }),
        ],
        { costaleros: costaleros.slice(0, 2), config: configConUnoBajo },
      ),
    );

    expect(hallazgos).toEqual([]);
  });

  it('tolerates a difference of one when the split is not exact', () => {
    const hallazgos = DESCANSO_DESIGUAL.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k3']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: asignaciones(TRABAJADORA_1, ['k3']) }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: asignaciones(TRABAJADORA_1, ['k2']) }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
        ],
        { costaleros: costaleros.slice(0, 3), config: configConUnoBajo },
      ),
    );

    expect(hallazgos).toEqual([]);
  });

  it('reports a difference over one when the split is not exact', () => {
    const hallazgos = DESCANSO_DESIGUAL.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k3']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: asignaciones(TRABAJADORA_1, ['k2']) }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: asignaciones(TRABAJADORA_1, ['k3']) }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: asignaciones(TRABAJADORA_1, ['k3']) }),
        ],
        { costaleros: costaleros.slice(0, 3), config: configConUnoBajo },
      ),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('DESCANSO_DESIGUAL');
    expect(hallazgos[0].severidad).toBe('warning');
    expect(hallazgos[0].contexto).toEqual({
      trabajaderaId: TRABAJADORA_1,
      trabajaderaNumero: 1,
      minimo: 1,
      maximo: 4,
      tolerancia: 1,
    });
  });

  it('measures the rest inside each working position', () => {
    const hallazgos = DESCANSO_DESIGUAL.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: asignaciones(TRABAJADORA_1, ['k2']) }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: asignaciones(TRABAJADORA_1, ['k2']) }),
        ],
        { costaleros: [costaleros[0], costaleros[1], costaleros[6]], config: configConUnoBajo },
      ),
    );

    expect(hallazgos).toEqual([]);
  });
});

describe('FUERA_EN_PRIMERO_Y_ULTIMO', () => {
  it('reports a costalero resting in the first and the last tramo of his working position', () => {
    const hallazgos = FUERA_EN_PRIMERO_Y_ULTIMO.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
        ],
        { costaleros: costaleros.slice(0, 2) },
      ),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('FUERA_EN_PRIMERO_Y_ULTIMO');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'El costalero k2 descansa en el primer tramo (1) y en el último (4) de la trabajadera 1.',
    );
  });

  it('accepts a costalero who is under the paso in the last tramo', () => {
    const hallazgos = FUERA_EN_PRIMERO_Y_ULTIMO.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: asignaciones(TRABAJADORA_1, ['k1', 'k2']) }),
        ],
        { costaleros: costaleros.slice(0, 2) },
      ),
    );

    expect(hallazgos).toEqual([]);
  });

  it('measures the last tramo of the working position, not the last of the plan', () => {
    const hallazgos = FUERA_EN_PRIMERO_Y_ULTIMO.evaluar(
      contextoDe(
        [
          tramo({ orden: 1, puntoId: 'p1', asignaciones: asignaciones(TRABAJADORA_1, ['k1']) }),
          tramo({ orden: 2, puntoId: 'p2', asignaciones: [] }),
          tramo({ orden: 3, puntoId: 'p3', asignaciones: [] }),
          tramo({ orden: 4, puntoId: 'p4', asignaciones: [] }),
        ],
        { paso: pasoConPrimeraCorta, costaleros: costaleros.slice(0, 2) },
      ),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].mensaje).toBe(
      'El costalero k2 descansa en el primer tramo (1) y en el último (2) de la trabajadera 1.',
    );
  });
});

describe('PUESTOS_MAL_CUBIERTOS', () => {
  it('reports a puesto left uncovered', () => {
    const hallazgos = PUESTOS_MAL_CUBIERTOS.evaluar(
      contextoDe([
        tramo({
          asignaciones: [
            ...asignaciones(TRABAJADORA_1, ['k1', 'k2', 'k3', 'k4']),
            ...BAJO_2,
          ],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('PUESTOS_MAL_CUBIERTOS');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'En el tramo 1, la trabajadera 1 no cubre el puesto corriente.',
    );
  });

  it('reports a puesto taken twice', () => {
    const hallazgos = PUESTOS_MAL_CUBIERTOS.evaluar(
      contextoDe([
        tramo({
          asignaciones: [
            ...asignaciones(TRABAJADORA_1, ['k1', 'k2', 'k3', 'k4', 'k5', 'k6']),
            ...BAJO_2,
          ],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].mensaje).toBe('En el tramo 1, la trabajadera 1 repite el puesto corriente.');
  });

  it('reports a costalero two levels above or below his own', () => {
    const hallazgos = PUESTOS_MAL_CUBIERTOS.evaluar(
      contextoDe([
        tramo({
          asignaciones: [
            ...asignaciones(TRABAJADORA_1, ['k5', 'k2', 'k3', 'k4', 'k6']),
            ...BAJO_2,
          ],
        }),
      ]),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('PUESTOS_MAL_CUBIERTOS');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'En el tramo 1, el costalero k5 (nivel 1) ocupa el puesto patero-izquierdo (nivel 3) de la trabajadera 1: no puede ocupar un puesto dos niveles por encima o por debajo del suyo.',
    );
  });

  it('accepts the five puestos covered with the right heights', () => {
    const hallazgos = PUESTOS_MAL_CUBIERTOS.evaluar(contextoDe([tramo()]));

    expect(hallazgos).toEqual([]);
  });
});

describe('rotacion valida', () => {
  const planValido: TramoPlanificado[] = [
    tramo({
      orden: 1,
      puntoId: 'p1',
      asignaciones: [
        ...asignaciones(TRABAJADORA_1, ['k1', 'k2', 'k3', 'k4', 'k5']),
        ...asignaciones(TRABAJADORA_2, ['k7', 'k8', 'k9', 'k10', 'k11']),
      ],
    }),
    tramo({
      orden: 2,
      puntoId: 'p2',
      asignaciones: [
        ...asignaciones(TRABAJADORA_1, ['k1', 'k2', 'k3', 'k4', 'k6']),
        ...asignaciones(TRABAJADORA_2, ['k7', 'k8', 'k9', 'k10', 'k12']),
      ],
    }),
    tramo({
      orden: 3,
      puntoId: 'p3',
      asignaciones: [
        ...asignaciones(TRABAJADORA_1, ['k1', 'k2', 'k3', 'k5', 'k6']),
        ...asignaciones(TRABAJADORA_2, ['k7', 'k8', 'k9', 'k11', 'k12']),
      ],
    }),
    tramo({
      orden: 4,
      puntoId: 'p4',
      asignaciones: [
        ...asignaciones(TRABAJADORA_1, ['k1', 'k2', 'k4', 'k5', 'k6']),
        ...asignaciones(TRABAJADORA_2, ['k7', 'k8', 'k10', 'k11', 'k12']),
      ],
    }),
  ];

  it('breaks no rule of the active catalogue', () => {
    const resultado = crearMotor(REGLAS_ACTUALES).evaluar(contextoDe(planValido));

    expect(resultado.hallazgos).toEqual([]);
    expect(resultado.valido).toBe(true);
  });
});

describe('FIJACION_NO_CUMPLIDA', () => {
  it('reports a costalero fixed inside who is not under the paso', () => {
    const hallazgos = FIJACION_NO_CUMPLIDA.evaluar(
      contextoDe([tramo()], { fijaciones: [{ costaleroId: 'k6', tramo: 1, estado: 'dentro' }] }),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('FIJACION_NO_CUMPLIDA');
    expect(hallazgos[0].severidad).toBe('error');
    expect(hallazgos[0].mensaje).toBe(
      'El costalero k6 está fijado dentro en el tramo 1, pero no va debajo del paso.',
    );
  });

  it('reports a costalero fixed outside who is under the paso', () => {
    const hallazgos = FIJACION_NO_CUMPLIDA.evaluar(
      contextoDe([tramo()], { fijaciones: [{ costaleroId: 'k1', tramo: 1, estado: 'fuera' }] }),
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].reglaId).toBe('FIJACION_NO_CUMPLIDA');
    expect(hallazgos[0].mensaje).toBe(
      'El costalero k1 está fijado fuera en el tramo 1, pero va debajo del paso.',
    );
  });

  it('accepts the fijaciones that the plan respects', () => {
    const hallazgos = FIJACION_NO_CUMPLIDA.evaluar(
      contextoDe([tramo()], {
        fijaciones: [
          { costaleroId: 'k1', tramo: 1, estado: 'dentro' },
          { costaleroId: 'k6', tramo: 1, estado: 'fuera' },
        ],
      }),
    );

    expect(hallazgos).toEqual([]);
  });
});
