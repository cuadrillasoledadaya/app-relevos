import { describe, expect, it } from 'vitest';

import {
  CODIGO_NUMERO_TRABAJADERAS_INVALIDO,
  ErrorDeDominio,
  MENSAJE_NUMERO_TRABAJADERAS_INVALIDO,
} from '../../src/domain/errors';
import { crearPaso } from '../../src/domain/paso';
import type { Paso } from '../../src/domain/types';

function crearPasoDePrueba(numeroTrabajaderas: number): Paso {
  const entrada = {
    id: 'paso-1',
    nombre: 'Paso de prueba',
    cuadrillaId: 'c1',
    numeroTrabajaderas,
  };

  return crearPaso(entrada);
}

describe('crearPaso', () => {
  it('creates one working position per requested number, numbered from 1 to N', () => {
    const paso = crearPasoDePrueba(4);

    expect(paso.trabajaderas).toHaveLength(4);
    expect(paso.trabajaderas.map((trabajadora) => trabajadora.numero)).toEqual([1, 2, 3, 4]);
    expect(paso.trabajaderas.map((trabajadora) => trabajadora.id)).toEqual([
      'trab-paso-1-1',
      'trab-paso-1-2',
      'trab-paso-1-3',
      'trab-paso-1-4',
    ]);
  });

  it('gives the working positions ids that are unique across the whole cuadrilla', () => {
    const pasoA = crearPaso({
      id: 'paso-a',
      nombre: 'Paso A',
      cuadrillaId: 'c1',
      numeroTrabajaderas: 3,
    });
    const pasoB = crearPaso({
      id: 'paso-b',
      nombre: 'Paso B',
      cuadrillaId: 'c1',
      numeroTrabajaderas: 3,
    });

    const ids = [...pasoA.trabajaderas, ...pasoB.trabajaderas].map(
      (trabajadora) => trabajadora.id,
    );

    expect(new Set(ids).size).toBe(6);
  });

  it('keeps the working positions sorted and splits them between both sides', () => {
    const paso = crearPasoDePrueba(5);

    const numeros = paso.trabajaderas.map((trabajadora) => trabajadora.numero);
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    expect(paso.trabajaderas.filter((trabajadora) => trabajadora.lado === 'izquierda')).toHaveLength(
      3,
    );
    expect(paso.trabajaderas.filter((trabajadora) => trabajadora.lado === 'derecha')).toHaveLength(2);
  });

  it('rejects a non integer or non positive number with the exact domain message', () => {
    const numerosInvalidos = [0, -1, 1.5, Number.NaN];

    for (const numeroTrabajaderas of numerosInvalidos) {
      let error: unknown;

      try {
        crearPasoDePrueba(numeroTrabajaderas);
      } catch (captured) {
        error = captured;
      }

      expect(error).toBeInstanceOf(ErrorDeDominio);
      expect((error as Error).message).toBe(MENSAJE_NUMERO_TRABAJADERAS_INVALIDO);
    }
  });

  it('rejects an invalid number with the stable domain error code', () => {
    let error: unknown;

    try {
      crearPasoDePrueba(0);
    } catch (captured) {
      error = captured;
    }

    expect(error).toBeInstanceOf(ErrorDeDominio);
    expect((error as ErrorDeDominio).codigo).toBe(CODIGO_NUMERO_TRABAJADERAS_INVALIDO);
    expect((error as ErrorDeDominio).message).toBe(MENSAJE_NUMERO_TRABAJADERAS_INVALIDO);
  });
});
