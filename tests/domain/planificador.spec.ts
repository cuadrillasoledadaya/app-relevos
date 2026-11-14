import { describe, expect, it } from 'vitest';

import { crearMotor } from '../../src/domain/motor';
import { crearPaso } from '../../src/domain/paso';
import { planificarRelevos } from '../../src/domain/planificador';
import { REGLAS_V1 } from '../../src/domain/reglas';
import type { Costalero, Cuadrilla, Paso, PuntoDeRelevo } from '../../src/domain/types';

const cuadrillas: Cuadrilla[] = [
  { id: 'c1', nombre: 'Cuadrilla Uno' },
  { id: 'c2', nombre: 'Cuadrilla Dos' },
  { id: 'c3', nombre: 'Cuadrilla Tres' },
];

function costalerosDe(cuadrillaId: string, prefijo: string, total: number): Costalero[] {
  return Array.from({ length: total }, (_, indice) => ({
    id: `${prefijo}${indice + 1}`,
    nombre: `${prefijo}${indice + 1}`,
    cuadrillaId,
    disponible: true,
  }));
}

const costaleros: Costalero[] = [
  ...costalerosDe('c1', 'k', 4),
  ...costalerosDe('c2', 'l', 4),
  { id: 'm0', nombre: 'm0', cuadrillaId: 'c3', disponible: false },
  ...costalerosDe('c3', 'm', 4),
];

const puntos: PuntoDeRelevo[] = [
  { id: 'p3', nombre: 'Plaza Mayor', orden: 3 },
  { id: 'p1', nombre: 'Puerta del Mar', orden: 1 },
  { id: 'p4', nombre: 'Ermita', orden: 4 },
  { id: 'p2', nombre: 'Calle Ancha', orden: 2 },
];

function crearPasoDePrueba(id: string, numeroTrabajaderas: number): Paso {
  const entrada = {
    id,
    nombre: 'Paso de prueba',
    cuadrillaId: 'c1',
    numeroTrabajaderas,
  };

  return crearPaso(entrada);
}

const paso = crearPasoDePrueba('paso-1', 4);

const entrada = { paso, cuadrillas, costaleros, puntos };

describe('planificarRelevos', () => {
  it('produces the same plan for the same input', () => {
    expect(planificarRelevos(entrada)).toEqual(planificarRelevos(entrada));
  });

  it('plans one relief per relief point', () => {
    const plan = planificarRelevos(entrada);

    expect(plan.pasoId).toBe(paso.id);
    expect(plan.relevos).toHaveLength(puntos.length);
  });

  it('covers every working position of the step in every relief', () => {
    const plan = planificarRelevos(entrada);
    const esperadas = paso.trabajaderas.map((trabajadora) => trabajadora.id).sort();

    for (const relevo of plan.relevos) {
      const cubiertas = relevo.asignaciones.map((asignacion) => asignacion.trabajaderaId).sort();
      expect(cubiertas).toEqual(esperadas);
    }
  });

  it('never lets the same crew take two consecutive reliefs', () => {
    const plan = planificarRelevos(entrada);

    for (let indice = 1; indice < plan.relevos.length; indice += 1) {
      expect(plan.relevos[indice].cuadrillaEntranteId).not.toBe(
        plan.relevos[indice - 1].cuadrillaEntranteId,
      );
    }
  });

  it('orders the reliefs by the order of their relief point', () => {
    const plan = planificarRelevos(entrada);

    expect(plan.relevos.map((relevo) => relevo.puntoId)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(plan.relevos.map((relevo) => relevo.orden)).toEqual([1, 2, 3, 4]);
  });

  it('only assigns available costaleros of the incoming crew', () => {
    const plan = planificarRelevos(entrada);

    for (const relevo of plan.relevos) {
      for (const asignacion of relevo.asignaciones) {
        const costalero = costaleros.find((candidato) => candidato.id === asignacion.costaleroId);

        expect(costalero).toBeDefined();
        expect(costalero?.disponible).toBe(true);
        expect(costalero?.cuadrillaId).toBe(relevo.cuadrillaEntranteId);
      }
    }
  });

  it('hands the step over from the titular crew in the first relief', () => {
    const plan = planificarRelevos(entrada);

    expect(plan.relevos[0].cuadrillaSalienteId).toBe(paso.cuadrillaId);
    expect(plan.relevos[1].cuadrillaSalienteId).toBe(plan.relevos[0].cuadrillaEntranteId);
  });

  it('keeps the gap detectable by the rules when the crew cannot cover the step', () => {
    const pasoGrande = crearPasoDePrueba('paso-2', 6);
    const costalerosEscasos = costalerosDe('c1', 'k', 2);
    const cuadrillaUnica: Cuadrilla[] = [{ id: 'c1', nombre: 'Cuadrilla Uno' }];

    const plan = planificarRelevos({
      paso: pasoGrande,
      cuadrillas: cuadrillaUnica,
      costaleros: costalerosEscasos,
      puntos,
    });

    expect(plan.relevos).toHaveLength(puntos.length);

    const resultado = crearMotor(REGLAS_V1).evaluar({
      paso: pasoGrande,
      plan,
      cuadrillas: cuadrillaUnica,
      costaleros: costalerosEscasos,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.hallazgos.map((hallazgo) => hallazgo.reglaId)).toContain(
      'TRABAJADERA_SIN_CUBRIR',
    );
  });
});
