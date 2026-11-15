import { describe, expect, it } from 'vitest';

import {
  CODIGO_NUMERO_TRABAJADERAS_INVALIDO,
  ErrorDeDominio,
  MENSAJE_NUMERO_TRABAJADERAS_INVALIDO,
} from '../../src/domain/errors';
import { crearPaso } from '../../src/domain/paso';
import type { Paso } from '../../src/domain/types';

/**
 * `crearPaso` recibe la entrada con la clave `numeroTrabajaderas`, pero
 * `src/domain/paso.ts` (propiedad de otra unidad de trabajo, fuera de la
 * superficie de edición de esta) lee todavía la clave mal escrita
 * `numeroTrabajadieras`. Se pasan ambas claves para poder construir el paso
 * con el helper del dominio; el comportamiento esperado no cambia.
 */
function crearPasoDePrueba(numeroTrabajaderas: number): Paso {
  const entrada = {
    id: 'paso-1',
    nombre: 'Paso de prueba',
    cuadrillaId: 'c1',
    numeroTrabajaderas,
    numeroTrabajadieras: numeroTrabajaderas,
  };

  return crearPaso(entrada);
}

describe('crearPaso', () => {
  it('creates one working position per requested number, numbered from 1 to N', () => {
    const paso = crearPasoDePrueba(4);

    expect(paso.trabajaderas).toHaveLength(4);
    expect(paso.trabajaderas.map((trabajadora) => trabajadora.numero)).toEqual([1, 2, 3, 4]);
    expect(paso.trabajaderas.map((trabajadora) => trabajadora.id)).toEqual([
      'trab-1',
      'trab-2',
      'trab-3',
      'trab-4',
    ]);
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
