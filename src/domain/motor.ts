import type {
  ContextoReglas,
  Hallazgo,
  MotorReglas,
  Regla,
  ResultadoValidacion,
} from './types';

/**
 * Motor de reglas.
 *
 * El motor no conoce ninguna regla concreta: sólo entiende el contrato
 * `Regla`. Añadir una regla nueva es registrarla en la lista que se le pasa
 * a `crearMotor`, sin tocar este archivo.
 *
 * Cada hallazgo se atribuye a la regla que lo produjo y hereda la severidad
 * declarada por esa regla. Un hallazgo de severidad `error` invalida el
 * resultado; los hallazgos `warning` sólo informan.
 */
export function crearMotor(reglas: Regla[]): MotorReglas {
  const reglasActivas = [...reglas];

  return {
    evaluar(contexto: ContextoReglas): ResultadoValidacion {
      const hallazgos: Hallazgo[] = [];

      for (const regla of reglasActivas) {
        for (const hallazgo of regla.evaluar(contexto)) {
          hallazgos.push({
            ...hallazgo,
            reglaId: regla.id,
            severidad: regla.severidad,
          });
        }
      }

      const valido = !hallazgos.some((hallazgo) => hallazgo.severidad === 'error');

      return { valido, hallazgos };
    },
  };
}
