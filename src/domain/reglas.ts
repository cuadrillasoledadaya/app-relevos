/**
 * Catálogo v2 de reglas de cambio de costaleros.
 *
 * El paso rota por trabajadera: cada costalero pertenece a una sola
 * trabajadera y rota dentro de ella, tramo a tramo. Por eso estas reglas
 * hablan de trabajaderas y de tramos, no de cuadrillas y de relevos.
 *
 * El motor (`crearMotor`) no conoce ninguna de estas reglas: el conjunto
 * activo es la lista que se exporta al final del archivo, y crece por
 * registro.
 *
 * Conceptos que comparten todas las reglas:
 * - Un tramo es *aplicable* a una trabajadera cuando su número de orden no
 *   supera los `tramos` que rota esa trabajadera. En los tramos que no le
 *   corresponden no se le exige cobertura y la racha de descanso de sus
 *   costaleros se corta.
 * - K es el número de costaleros debajo del paso en cada trabajadera y tramo
 *   (`costalerosPorTrabajadera`, 5 por defecto: los cinco puestos).
 * - M es el número máximo de tramos seguidos sin asignación
 *   (`maxTramosFueraSeguidos`, 2 por defecto).
 */

import { CONFIG_ROTACION_POR_DEFECTO, NIVEL_ROL, PUESTOS_TRABAJADERA } from './types'
import type {
  AsignacionCostalero,
  ConfigRotacion,
  ContextoReglas,
  Costalero,
  Hallazgo,
  PuestoCostalero,
  Regla,
  Trabajadera,
  TramoPlanificado,
} from './types'

/** Regla del catálogo con su mensaje en español para la persona usuaria. */
export interface ReglaCatalogo extends Regla {
  /** Mensaje en español que enuncia la invariante que protege la regla. */
  mensaje: string
}

/** Normaliza un texto que puede llegar ausente o vacío. */
function textoSeguro(valor: string | undefined): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

/** Enumera valores de forma natural: `1 y 2`, `1, 2 y 3`. */
function enumerar(valores: (number | string)[]): string {
  if (valores.length <= 1) {
    return valores.join('')
  }

  const ultimo = valores[valores.length - 1]
  const anteriores = valores.slice(0, valores.length - 1)

  return `${anteriores.join(', ')} y ${ultimo}`
}

/** Tramos del plan ordenados por su orden de secuencia. */
function tramosOrdenados(contexto: ContextoReglas): TramoPlanificado[] {
  return [...contexto.plan.tramos].sort((anterior, actual) => anterior.orden - actual.orden)
}

/** Trabajaderas del paso ordenadas por su número. */
function trabajaderasOrdenadas(contexto: ContextoReglas): Trabajadera[] {
  return [...contexto.paso.trabajaderas].sort((anterior, actual) => anterior.numero - actual.numero)
}

/** Parámetros de la rotación que rigen para este contexto. */
function configDe(contexto: ContextoReglas): ConfigRotacion {
  return {
    costalerosPorTrabajadera:
      contexto.config?.costalerosPorTrabajadera ??
      CONFIG_ROTACION_POR_DEFECTO.costalerosPorTrabajadera,
    maxTramosFueraSeguidos:
      contexto.config?.maxTramosFueraSeguidos ?? CONFIG_ROTACION_POR_DEFECTO.maxTramosFueraSeguidos,
  }
}

/**
 * ¿Rota esta trabajadera en el tramo dado?
 *
 * `indiceTramo` es la posición del tramo en el plan, contando desde 1.
 */
function esTramoAplicable(trabajadera: Trabajadera, indiceTramo: number): boolean {
  return indiceTramo <= Math.max(trabajadera.tramos, 0)
}

/** Asignaciones de un tramo que pertenecen a una trabajadera. */
function asignacionesDe(tramo: TramoPlanificado, trabajaderaId: string): AsignacionCostalero[] {
  return tramo.asignaciones.filter((asignacion) => asignacion.trabajaderaId === trabajaderaId)
}

/** ¿Tiene este costalero alguna asignación en el tramo? */
function tieneAsignacion(tramo: TramoPlanificado, costaleroId: string): boolean {
  return tramo.asignaciones.some((asignacion) => asignacion.costaleroId === costaleroId)
}

/** Costaleros que pertenecen a una trabajadera. */
function costalerosDe(contexto: ContextoReglas, trabajaderaId: string): Costalero[] {
  return contexto.costaleros.filter((costalero) => costalero.trabajaderaId === trabajaderaId)
}

/** Trabajadera del paso a la que pertenece un costalero. */
function trabajaderaDe(contexto: ContextoReglas, costalero: Costalero): Trabajadera | undefined {
  return contexto.paso.trabajaderas.find(
    (trabajadera) => trabajadera.id === costalero.trabajaderaId,
  )
}

/**
 * Tramos en los que un costalero cuenta como requerido: los aplicables a su
 * trabajadera. En el resto no se le exige estar debajo del paso.
 */
function tramosRequeridos(
  contexto: ContextoReglas,
  costalero: Costalero,
  tramos: TramoPlanificado[],
): TramoPlanificado[] {
  const trabajadera = trabajaderaDe(contexto, costalero)

  if (!trabajadera) {
    return []
  }

  return tramos.filter((_tramo, indice) => esTramoAplicable(trabajadera, indice + 1))
}

/**
 * Todo tramo de la rotación debe indicar el punto del recorrido en el que se
 * produce.
 */
export const TRAMO_SIN_PUNTO: ReglaCatalogo = {
  id: 'TRAMO_SIN_PUNTO',
  severidad: 'error',
  descripcion:
    'Todo tramo de la rotación debe indicar el punto del recorrido en el que se produce.',
  mensaje: 'Todo tramo de la rotación debe indicar su punto del recorrido.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []

    for (const tramo of tramosOrdenados(contexto)) {
      if (textoSeguro(tramo.puntoId) === '') {
        hallazgos.push({
          reglaId: TRAMO_SIN_PUNTO.id,
          severidad: 'error',
          mensaje: `El tramo ${tramo.orden} no tiene punto del recorrido.`,
          contexto: { orden: tramo.orden },
        })
      }
    }

    return hallazgos
  },
}

/**
 * No se puede repetir el punto del recorrido en dos tramos de la rotación.
 */
export const PUNTO_DE_RELEVO_DUPLICADO: ReglaCatalogo = {
  id: 'PUNTO_DE_RELEVO_DUPLICADO',
  severidad: 'warning',
  descripcion: 'Cada punto del recorrido aparece en un solo tramo de la rotación.',
  mensaje: 'No se puede repetir el punto del recorrido en dos tramos de la rotación.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []
    const ordenesPorPunto = new Map<string, number[]>()

    for (const tramo of tramosOrdenados(contexto)) {
      const puntoId = textoSeguro(tramo.puntoId)

      if (puntoId === '') {
        continue
      }

      const ordenes = ordenesPorPunto.get(puntoId) ?? []
      ordenes.push(tramo.orden)
      ordenesPorPunto.set(puntoId, ordenes)
    }

    for (const [puntoId, ordenes] of ordenesPorPunto) {
      if (ordenes.length > 1) {
        hallazgos.push({
          reglaId: PUNTO_DE_RELEVO_DUPLICADO.id,
          severidad: 'warning',
          mensaje: `El punto del recorrido ${puntoId} se repite en los tramos ${enumerar(ordenes)}.`,
          contexto: { puntoId, ordenes },
        })
      }
    }

    return hallazgos
  },
}

/**
 * Toda trabajadera aplicable al tramo debe tener a alguien debajo del paso.
 */
export const TRABAJADERA_SIN_CUBRIR: ReglaCatalogo = {
  id: 'TRABAJADERA_SIN_CUBRIR',
  severidad: 'error',
  descripcion: 'Cada trabajadera aplicable al tramo debe tener costaleros debajo del paso.',
  mensaje: 'Toda trabajadera aplicable al tramo debe tener a alguien debajo del paso.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []
    const tramos = tramosOrdenados(contexto)

    for (const [indice, tramo] of tramos.entries()) {
      for (const trabajadera of trabajaderasOrdenadas(contexto)) {
        if (!esTramoAplicable(trabajadera, indice + 1)) {
          continue
        }

        if (asignacionesDe(tramo, trabajadera.id).length === 0) {
          hallazgos.push({
            reglaId: TRABAJADERA_SIN_CUBRIR.id,
            severidad: 'error',
            mensaje: `El tramo ${tramo.orden} deja sin cubrir la trabajadera ${trabajadera.numero}.`,
            contexto: {
              orden: tramo.orden,
              trabajaderaId: trabajadera.id,
              trabajaderaNumero: trabajadera.numero,
            },
          })
        }
      }
    }

    return hallazgos
  },
}

/**
 * Cada trabajadera aplicable al tramo tiene exactamente K costaleros debajo
 * del paso (regla R1 de la cuadrilla).
 */
export const COSTALEROS_POR_TRABAJADERA: ReglaCatalogo = {
  id: 'COSTALEROS_POR_TRABAJADERA',
  severidad: 'error',
  descripcion:
    'Cada trabajadera aplicable al tramo tiene exactamente K costaleros debajo del paso.',
  mensaje:
    'Cada trabajadera aplicable al tramo tiene exactamente el número configurado de costaleros debajo del paso.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []
    const esperado = configDe(contexto).costalerosPorTrabajadera
    const tramos = tramosOrdenados(contexto)

    for (const [indice, tramo] of tramos.entries()) {
      for (const trabajadera of trabajaderasOrdenadas(contexto)) {
        if (!esTramoAplicable(trabajadera, indice + 1)) {
          continue
        }

        const conteo = asignacionesDe(tramo, trabajadera.id).length

        if (conteo !== esperado) {
          hallazgos.push({
            reglaId: COSTALEROS_POR_TRABAJADERA.id,
            severidad: 'error',
            mensaje: `La cantidad de costaleros asignados a la trabajadera ${trabajadera.numero} en el tramo ${tramo.orden} es ${conteo}; se esperan ${esperado}.`,
            contexto: {
              orden: tramo.orden,
              trabajaderaId: trabajadera.id,
              trabajaderaNumero: trabajadera.numero,
              conteo,
              esperado,
            },
          })
        }
      }
    }

    return hallazgos
  },
}

/**
 * Toda asignación es de un costalero de esa misma trabajadera (regla R2 de la
 * cuadrilla): el costalero pertenece a una sola trabajadera.
 */
export const COSTALERO_FUERA_DE_TRABAJADERA: ReglaCatalogo = {
  id: 'COSTALERO_FUERA_DE_TRABAJADERA',
  severidad: 'error',
  descripcion: 'Toda asignación es de un costalero de esa misma trabajadera.',
  mensaje: 'Sólo se asignan costaleros de la trabajadera en la que se les coloca.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []

    for (const tramo of tramosOrdenados(contexto)) {
      for (const asignacion of tramo.asignaciones) {
        const costalero = contexto.costaleros.find(
          (candidato) => candidato.id === asignacion.costaleroId,
        )

        if (!costalero) {
          hallazgos.push({
            reglaId: COSTALERO_FUERA_DE_TRABAJADERA.id,
            severidad: 'error',
            mensaje: `El tramo ${tramo.orden} asigna al costalero ${asignacion.costaleroId}, que no pertenece a la cuadrilla y no se le puede asignar.`,
            contexto: {
              orden: tramo.orden,
              costaleroId: asignacion.costaleroId,
              trabajaderaId: asignacion.trabajaderaId,
            },
          })

          continue
        }

        if (costalero.trabajaderaId !== asignacion.trabajaderaId) {
          hallazgos.push({
            reglaId: COSTALERO_FUERA_DE_TRABAJADERA.id,
            severidad: 'error',
            mensaje: `El costalero ${asignacion.costaleroId} no pertenece a la trabajadera ${asignacion.trabajaderaId} en la que se le asigna en el tramo ${tramo.orden}.`,
            contexto: {
              orden: tramo.orden,
              costaleroId: asignacion.costaleroId,
              trabajaderaId: asignacion.trabajaderaId,
            },
          })
        }
      }
    }

    return hallazgos
  },
}

/**
 * No se asignan costaleros marcados como no disponibles.
 */
export const COSTALERO_NO_DISPONIBLE: ReglaCatalogo = {
  id: 'COSTALERO_NO_DISPONIBLE',
  severidad: 'error',
  descripcion: 'No se asignan costaleros marcados como no disponibles.',
  mensaje: 'No se pueden asignar costaleros que no estén disponibles.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []

    for (const tramo of tramosOrdenados(contexto)) {
      for (const asignacion of tramo.asignaciones) {
        const costalero = contexto.costaleros.find(
          (candidato) => candidato.id === asignacion.costaleroId,
        )

        if (costalero && costalero.disponible !== true) {
          hallazgos.push({
            reglaId: COSTALERO_NO_DISPONIBLE.id,
            severidad: 'error',
            mensaje: `El costalero ${asignacion.costaleroId} no está disponible para el tramo ${tramo.orden}.`,
            contexto: {
              orden: tramo.orden,
              costaleroId: asignacion.costaleroId,
            },
          })
        }
      }
    }

    return hallazgos
  },
}

/**
 * Un costalero no aparece dos veces en el mismo tramo.
 */
export const COSTALERO_REPETIDO_EN_TRAMO: ReglaCatalogo = {
  id: 'COSTALERO_REPETIDO_EN_TRAMO',
  severidad: 'error',
  descripcion: 'Un costalero ocupa un solo puesto en cada tramo.',
  mensaje: 'Un costalero no puede aparecer dos veces en el mismo tramo.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []

    for (const tramo of tramosOrdenados(contexto)) {
      const apariciones = new Map<string, number>()

      for (const asignacion of tramo.asignaciones) {
        apariciones.set(asignacion.costaleroId, (apariciones.get(asignacion.costaleroId) ?? 0) + 1)
      }

      for (const [costaleroId, veces] of apariciones) {
        if (veces > 1) {
          hallazgos.push({
            reglaId: COSTALERO_REPETIDO_EN_TRAMO.id,
            severidad: 'error',
            mensaje: `El costalero ${costaleroId} aparece ${veces} veces en el tramo ${tramo.orden}.`,
            contexto: {
              orden: tramo.orden,
              costaleroId,
              veces,
            },
          })
        }
      }
    }

    return hallazgos
  },
}

/**
 * Ningún costalero pasa más de M tramos seguidos sin asignación (regla R3 de
 * la cuadrilla). La racha se cuenta en los tramos que rota su trabajadera: en
 * los que no rota, la racha se corta.
 */
export const COSTALERO_FUERA_DEMASIADO_TIEMPO: ReglaCatalogo = {
  id: 'COSTALERO_FUERA_DEMASIADO_TIEMPO',
  severidad: 'error',
  descripcion: 'Ningún costalero pasa más de M tramos seguidos sin asignación.',
  mensaje: 'Ningún costalero puede pasar demasiados tramos seguidos sin asignación.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []
    const maximo = configDe(contexto).maxTramosFueraSeguidos
    const tramos = tramosOrdenados(contexto)

    for (const costalero of contexto.costaleros) {
      // Un costalero no disponible no rota: no se le mide la racha.
      if (costalero.disponible !== true) {
        continue
      }

      const trabajadera = trabajaderaDe(contexto, costalero)
      let racha = 0
      let rachaMaxima = 0

      for (const [indice, tramo] of tramos.entries()) {
        if (!trabajadera || !esTramoAplicable(trabajadera, indice + 1)) {
          // Tramo en el que esta trabajadera no rota: la racha se corta.
          racha = 0

          continue
        }

        if (tieneAsignacion(tramo, costalero.id)) {
          racha = 0
        } else {
          racha += 1
          rachaMaxima = Math.max(rachaMaxima, racha)
        }
      }

      if (rachaMaxima > maximo) {
        hallazgos.push({
          reglaId: COSTALERO_FUERA_DEMASIADO_TIEMPO.id,
          severidad: 'error',
          mensaje: `El costalero ${costalero.id} pasa ${rachaMaxima} tramos seguidos sin asignación; el máximo permitido es ${maximo}.`,
          contexto: {
            costaleroId: costalero.id,
            racha: rachaMaxima,
            maximo,
          },
        })
      }
    }

    return hallazgos
  },
}

/**
 * El descanso se reparte por trabajadera (regla R4 de la cuadrilla): la
 * diferencia entre el mayor y el menor descanso de los costaleros de una misma
 * trabajadera no supera la tolerancia. La tolerancia es 0 cuando el reparto
 * sale exacto —cuando `(tramos de la trabajadera × (n − K))` es divisible por
 * `n`— y 1 cuando no.
 */
export const DESCANSO_DESIGUAL: ReglaCatalogo = {
  id: 'DESCANSO_DESIGUAL',
  severidad: 'warning',
  descripcion:
    'El descanso de los costaleros de una trabajadera se reparte con la tolerancia del reparto.',
  mensaje:
    'El descanso de los costaleros de una trabajadera debe repartirse con la tolerancia que permite el total de huecos.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []
    const tramos = tramosOrdenados(contexto)
    const esperado = configDe(contexto).costalerosPorTrabajadera

    for (const trabajadera of trabajaderasOrdenadas(contexto)) {
      // Sólo rotan los costaleros disponibles: el reparto se mide sobre ellos.
      const costaleros = costalerosDe(contexto, trabajadera.id).filter(
        (costalero) => costalero.disponible === true,
      )

      if (costaleros.length === 0) {
        continue
      }

      const totalCostaleros = costaleros.length
      const totalHuecos = Math.max(trabajadera.tramos, 0) * (totalCostaleros - esperado)
      const tolerancia = totalHuecos % totalCostaleros === 0 ? 0 : 1
      const descansos = costaleros.map(
        (costalero) =>
          tramosRequeridos(contexto, costalero, tramos).filter(
            (tramo) => !tieneAsignacion(tramo, costalero.id),
          ).length,
      )
      const minimo = Math.min(...descansos)
      const maximo = Math.max(...descansos)

      if (maximo - minimo > tolerancia) {
        hallazgos.push({
          reglaId: DESCANSO_DESIGUAL.id,
          severidad: 'warning',
          mensaje: `La trabajadera ${trabajadera.numero} tiene un reparto de descanso desigual: el mínimo es ${minimo} tramos sin asignación y el máximo es ${maximo}.`,
          contexto: {
            trabajaderaId: trabajadera.id,
            trabajaderaNumero: trabajadera.numero,
            minimo,
            maximo,
            tolerancia,
          },
        })
      }
    }

    return hallazgos
  },
}

/**
 * Nadie descansa en el primer tramo y en el último de su trabajadera a la vez
 * (regla R7 de la cuadrilla). El primero y el último son los de su propia
 * trabajadera, no los del plan entero.
 */
export const FUERA_EN_PRIMERO_Y_ULTIMO: ReglaCatalogo = {
  id: 'FUERA_EN_PRIMERO_Y_ULTIMO',
  severidad: 'error',
  descripcion: 'Nadie descansa en el primer tramo y en el último de su trabajadera a la vez.',
  mensaje: 'Nadie puede descansar en el primer tramo y en el último de su trabajadera.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []
    const tramos = tramosOrdenados(contexto)

    for (const trabajadera of trabajaderasOrdenadas(contexto)) {
      // Con un solo tramo el primero y el último son el mismo: la regla no
      // tiene sentido y no se comprueba.
      if (trabajadera.tramos < 2 || tramos.length < trabajadera.tramos) {
        continue
      }

      const primero = tramos[0]
      const ultimo = tramos[trabajadera.tramos - 1]

      for (const costalero of costalerosDe(contexto, trabajadera.id)) {
        const descansaPrimero = !tieneAsignacion(primero, costalero.id)
        const descansaUltimo = !tieneAsignacion(ultimo, costalero.id)

        if (descansaPrimero && descansaUltimo) {
          hallazgos.push({
            reglaId: FUERA_EN_PRIMERO_Y_ULTIMO.id,
            severidad: 'error',
            mensaje: `El costalero ${costalero.id} descansa en el primer tramo (${primero.orden}) y en el último (${ultimo.orden}) de la trabajadera ${trabajadera.numero}.`,
            contexto: {
              costaleroId: costalero.id,
              trabajaderaId: trabajadera.id,
              trabajaderaNumero: trabajadera.numero,
              primerTramo: primero.orden,
              ultimoTramo: ultimo.orden,
            },
          })
        }
      }
    }

    return hallazgos
  },
}

/**
 * Los cinco puestos de la trabajadera quedan cubiertos una vez cada uno y
 * ningún costalero ocupa un puesto dos niveles por encima o por debajo del
 * suyo (regla R8 de la cuadrilla).
 */
export const PUESTOS_MAL_CUBIERTOS: ReglaCatalogo = {
  id: 'PUESTOS_MAL_CUBIERTOS',
  severidad: 'error',
  descripcion:
    'Los cinco puestos quedan cubiertos una vez cada uno y con la jerarquía de alturas correcta.',
  mensaje:
    'Los cinco puestos de cada trabajadera deben quedar cubiertos una vez cada uno y respetar la jerarquía de alturas.',
  evaluar(contexto: ContextoReglas): Hallazgo[] {
    const hallazgos: Hallazgo[] = []
    const tramos = tramosOrdenados(contexto)

    for (const [indice, tramo] of tramos.entries()) {
      for (const trabajadera of trabajaderasOrdenadas(contexto)) {
        if (!esTramoAplicable(trabajadera, indice + 1)) {
          continue
        }

        const asignaciones = asignacionesDe(tramo, trabajadera.id)
        const conteoPorPuesto = new Map<PuestoCostalero, number>()

        for (const asignacion of asignaciones) {
          conteoPorPuesto.set(asignacion.puesto, (conteoPorPuesto.get(asignacion.puesto) ?? 0) + 1)
        }

        for (const puesto of PUESTOS_TRABAJADERA) {
          const conteo = conteoPorPuesto.get(puesto) ?? 0

          if (conteo === 0) {
            hallazgos.push({
              reglaId: PUESTOS_MAL_CUBIERTOS.id,
              severidad: 'error',
              mensaje: `En el tramo ${tramo.orden}, la trabajadera ${trabajadera.numero} no cubre el puesto ${puesto}.`,
              contexto: {
                orden: tramo.orden,
                trabajaderaId: trabajadera.id,
                trabajaderaNumero: trabajadera.numero,
                puesto,
              },
            })
          } else if (conteo > 1) {
            hallazgos.push({
              reglaId: PUESTOS_MAL_CUBIERTOS.id,
              severidad: 'error',
              mensaje: `En el tramo ${tramo.orden}, la trabajadera ${trabajadera.numero} repite el puesto ${puesto}.`,
              contexto: {
                orden: tramo.orden,
                trabajaderaId: trabajadera.id,
                trabajaderaNumero: trabajadera.numero,
                puesto,
                veces: conteo,
              },
            })
          }
        }

        for (const asignacion of asignaciones) {
          const costalero = contexto.costaleros.find(
            (candidato) => candidato.id === asignacion.costaleroId,
          )

          if (!costalero) {
            continue
          }

          const nivelRol = NIVEL_ROL[costalero.rol]
          const nivelPuesto = NIVEL_ROL[asignacion.puesto]

          if (Math.abs(nivelRol - nivelPuesto) >= 2) {
            hallazgos.push({
              reglaId: PUESTOS_MAL_CUBIERTOS.id,
              severidad: 'error',
              mensaje: `En el tramo ${tramo.orden}, el costalero ${asignacion.costaleroId} (nivel ${nivelRol}) ocupa el puesto ${asignacion.puesto} (nivel ${nivelPuesto}) de la trabajadera ${trabajadera.numero}: no puede ocupar un puesto dos niveles por encima o por debajo del suyo.`,
              contexto: {
                orden: tramo.orden,
                costaleroId: asignacion.costaleroId,
                trabajaderaId: trabajadera.id,
                trabajaderaNumero: trabajadera.numero,
                puesto: asignacion.puesto,
                nivelRol,
                nivelPuesto,
              },
            })
          }
        }
      }
    }

    return hallazgos
  },
}

/**
 * Catálogo v2: las once reglas del modelo por trabajadera.
 *
 * Es el punto de registro: una regla nueva se añade a esta lista (o se
 * registra en otra lista que se pase a `crearMotor`) sin tocar el motor.
 */
export const REGLAS_V2: ReglaCatalogo[] = [
  TRAMO_SIN_PUNTO,
  PUNTO_DE_RELEVO_DUPLICADO,
  TRABAJADERA_SIN_CUBRIR,
  COSTALEROS_POR_TRABAJADERA,
  COSTALERO_FUERA_DE_TRABAJADERA,
  COSTALERO_NO_DISPONIBLE,
  COSTALERO_REPETIDO_EN_TRAMO,
  COSTALERO_FUERA_DEMASIADO_TIEMPO,
  DESCANSO_DESIGUAL,
  FUERA_EN_PRIMERO_Y_ULTIMO,
  PUESTOS_MAL_CUBIERTOS,
]

/**
 * Conjunto activo completo de reglas.
 *
 * Las reglas del relevo por cuadrilla desaparecieron con el modelo por
 * trabajadera: describen un relevo que ya no existe.
 */
export const REGLAS_ACTUALES: ReglaCatalogo[] = [...REGLAS_V2]
