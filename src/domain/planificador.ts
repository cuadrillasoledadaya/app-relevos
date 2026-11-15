/**
 * Planificador de la rotación por trabajadera.
 *
 * El planificador no elige cuadrillas: rota la plantilla de cada trabajadera
 * tramo a tramo, con el criterio de la cuadrilla (S11):
 *
 * 1. En cada tramo de cada trabajadera hay exactamente `K` costaleros debajo
 *    del paso (los cinco puestos); el resto descansa.
 * 2. Quien alcanzó `M` tramos seguidos descansando vuelve a entrar (R3).
 * 3. En el último tramo de su trabajadera, quien descansó en el primero vuelve
 *    a entrar (R7). Si no se puede cerrar el reparto respetando a la vez R7 y
 *    la jerarquía de alturas, la rotación no es posible: se avisa con un error
 *    de dominio en vez de devolver un plan que incumple una regla.
 * 4. Del resto, descansa primero quien menos ha descansado en total; a
 *    igualdad, quien más tramos seguidos lleva debajo del paso; a igualdad, el
 *    identificador más pequeño.
 * 5. La jerarquía de alturas manda: bajo el paso no puede haber más de tres
 *    costaleros de nivel 1 ni más de cuatro de nivel 3. Esa cota se aplica
 *    antes de completar el reparto por justicia.
 * 6. Los `K` que quedan debajo se reparten los cinco puestos minimizando el
 *    coste (0 por su rol natural, 1 por el mismo nivel, 2 por otro nivel
 *    permitido); a igualdad de coste gana la asignación con el identificador
 *    más pequeño.
 *
 * El plan es determinista: la misma entrada produce siempre el mismo plan. No
 * hay azar, ni fechas, ni estado global.
 */

import {
  CODIGO_COSTALEROS_INSUFICIENTES,
  CODIGO_FIJACION_IMPOSIBLE,
  CODIGO_FIJACION_INVALIDA,
  CODIGO_ROTACION_IMPOSIBLE,
  ErrorDeDominio,
  MENSAJE_COSTALEROS_INSUFICIENTES,
  MENSAJE_FIJACION_IMPOSIBLE,
  MENSAJE_FIJACION_INVALIDA,
  MENSAJE_ROTACION_IMPOSIBLE,
} from './errors'
import { CONFIG_ROTACION_POR_DEFECTO, NIVEL_ROL, PUESTOS_TRABAJADERA } from './types'
import type {
  AsignacionCostalero,
  Costalero,
  EntradaRotacion,
  FijacionCostalero,
  PlanDeRotacion,
  PuntoDeRelevo,
  PuestoCostalero,
  Trabajadera,
  TramoPlanificado,
} from './types'

/**
 * Cota de costaleros de nivel 1 (corriente) que pueden llevar el paso a la vez.
 *
 * Salen de los propios puestos: un costalero de nivel 1 sólo puede ocupar
 * `corriente`, `fijador-izquierdo` y `fijador-derecho`, que son tres.
 */
export const MAX_COSTALEROS_NIVEL_1_DEBAJO = 3

/**
 * Cota de costaleros de nivel 3 (patero) que pueden llevar el paso a la vez.
 *
 * Un costalero de nivel 3 no puede ocupar `corriente`, así que le quedan
 * cuatro puestos.
 */
export const MAX_COSTALEROS_NIVEL_3_DEBAJO = 4

/** Estado de rotación de un costalero dentro de su trabajadera. */
interface EstadoCostalero {
  /** Tramos que lleva descansados en total. */
  descansos: number
  /** Tramos seguidos descansando. */
  descansosSeguidos: number
  /** Tramos seguidos llevando el paso. */
  bajo: number
}

/**
 * Planifica la rotación de un paso.
 *
 * @param entrada El paso, sus costaleros disponibles, los puntos del recorrido
 * y, si se quiere, los parámetros de la rotación.
 * @returns El plan: un tramo por cada punto del recorrido, con la plantilla de
 * cada trabajadera.
 */
export function planificarRotacion(entrada: EntradaRotacion): PlanDeRotacion {
  const config = entrada.config ?? CONFIG_ROTACION_POR_DEFECTO
  const K = config.costalerosPorTrabajadera
  const M = config.maxTramosFueraSeguidos

  const grupos = agruparPorTrabajadera(entrada.costaleros)
  const trabajaderas = [...entrada.paso.trabajaderas].sort((a, b) => a.numero - b.numero)
  const fijaciones = validarFijaciones(entrada)

  // Cada trabajadera rota con su propio estado: sus tramos son suyos.
  const rotaciones = new Map<string, Map<number, AsignacionCostalero[]>>()

  for (const trabajadera of trabajaderas) {
    rotaciones.set(
      trabajadera.id,
      rotarTrabajadera(
        trabajadera,
        grupos.get(trabajadera.id) ?? [],
        K,
        M,
        fijaciones.get(trabajadera.id) ?? [],
      ),
    )
  }

  const totalTramos = trabajaderas.reduce((maximo, t) => Math.max(maximo, t.tramos), 0)
  const tramos: TramoPlanificado[] = []

  for (let orden = 1; orden <= totalTramos; orden += 1) {
    const asignaciones: AsignacionCostalero[] = []

    for (const trabajadera of trabajaderas) {
      // Una trabajadera con menos tramos no rota en los sobrantes.
      if (trabajadera.tramos < orden) {
        continue
      }

      asignaciones.push(...(rotaciones.get(trabajadera.id)?.get(orden) ?? []))
    }

    tramos.push({
      orden,
      puntoId: puntoIdDelTramo(orden, entrada.puntos),
      asignaciones,
    })
  }

  return { pasoId: entrada.paso.id, tramos }
}

/**
 * Valida las fijaciones manuales y las reparte por trabajadera.
 *
 * Una fijación tiene que apuntar a un costalero del paso, a un tramo de la
 * rotación de su trabajadera y a un estado. Dos fijaciones del mismo
 * costalero en el mismo tramo con estados distintos son contradictorias.
 */
function validarFijaciones(entrada: EntradaRotacion): Map<string, FijacionCostalero[]> {
  const porTrabajadera = new Map<string, FijacionCostalero[]>()
  const costalerosPorId = new Map(entrada.costaleros.map((persona) => [persona.id, persona]))
  const trabajaderasPorId = new Map(entrada.paso.trabajaderas.map((t) => [t.id, t]))
  const vistas = new Map<string, string>()

  for (const fijacion of entrada.fijaciones ?? []) {
    const persona = costalerosPorId.get(fijacion.costaleroId)

    if (!persona) {
      throw errorFijacion(`no hay ningún costalero con el identificador ${fijacion.costaleroId}`)
    }

    const trabajadera = trabajaderasPorId.get(persona.trabajaderaId)

    if (!trabajadera) {
      throw errorFijacion(
        `el costalero ${persona.id} pertenece a una trabajadera que no está en el paso`,
      )
    }

    if (
      !Number.isInteger(fijacion.tramo) ||
      fijacion.tramo < 1 ||
      fijacion.tramo > trabajadera.tramos
    ) {
      throw errorFijacion(
        `el tramo ${fijacion.tramo} está fuera de la rotación de la trabajadera ${trabajadera.numero}`,
      )
    }

    const clave = `${fijacion.costaleroId}:${fijacion.tramo}`
    const estadoPrevio = vistas.get(clave)

    if (estadoPrevio && estadoPrevio !== fijacion.estado) {
      throw errorFijacion(
        `el costalero ${fijacion.costaleroId} está fijado dos veces en el tramo ${fijacion.tramo}, con estados distintos`,
      )
    }

    vistas.set(clave, fijacion.estado)

    const lista = porTrabajadera.get(persona.trabajaderaId) ?? []
    lista.push(fijacion)
    porTrabajadera.set(persona.trabajaderaId, lista)
  }

  return porTrabajadera
}
/**
 * Agrupa los costaleros disponibles por trabajadera y ordena cada grupo por
 * identificador, para que el reparto no dependa del orden de la entrada.
 */
function agruparPorTrabajadera(costaleros: Costalero[]): Map<string, Costalero[]> {
  const grupos = new Map<string, Costalero[]>()

  for (const persona of costaleros) {
    if (!persona.disponible) {
      continue
    }

    const grupo = grupos.get(persona.trabajaderaId) ?? []
    grupo.push(persona)
    grupos.set(persona.trabajaderaId, grupo)
  }

  for (const grupo of grupos.values()) {
    grupo.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }

  return grupos
}

/**
 * Rota la plantilla de una trabajadera tramo a tramo.
 *
 * @returns Las asignaciones de cada tramo de la trabajadera, indexadas por su
 * orden.
 */
function rotarTrabajadera(
  trabajadera: Trabajadera,
  grupo: Costalero[],
  K: number,
  M: number,
  fijaciones: FijacionCostalero[],
): Map<number, AsignacionCostalero[]> {
  const n = grupo.length

  if (n < K) {
    throw new ErrorDeDominio(CODIGO_COSTALEROS_INSUFICIENTES, MENSAJE_COSTALEROS_INSUFICIENTES)
  }

  const descansosPorTramo = n - K
  const estado = new Map<string, EstadoCostalero>()
  const nivelPorId = new Map(grupo.map((persona) => [persona.id, nivelDe(persona)]))

  for (const persona of grupo) {
    estado.set(persona.id, { descansos: 0, descansosSeguidos: 0, bajo: 0 })
  }

  // Cotas de la jerarquía de alturas: del total del grupo, al menos estos
  // tienen que descansar para que bajo el paso no haya más de los que caben.
  const minimoNivel1 = Math.max(
    0,
    grupo.filter((persona) => nivelDe(persona) === 1).length - MAX_COSTALEROS_NIVEL_1_DEBAJO,
  )
  const minimoNivel3 = Math.max(
    0,
    grupo.filter((persona) => nivelDe(persona) === 3).length - MAX_COSTALEROS_NIVEL_3_DEBAJO,
  )

  const plan = new Map<number, AsignacionCostalero[]>()
  let descansaronEnElPrimerTramo: string[] = []

  for (let orden = 1; orden <= Math.max(0, trabajadera.tramos); orden += 1) {
    // 0. Fijaciones manuales de este tramo (R6): el que está fijo dentro va
    //    debajo del paso y el que está fijo fuera descansa.
    const fijadosDentro: string[] = []
    const fijadosFuera: string[] = []

    for (const fijacion of fijaciones) {
      if (fijacion.tramo !== orden) {
        continue
      }

      if (fijacion.estado === 'dentro') {
        fijadosDentro.push(fijacion.costaleroId)
      } else {
        fijadosFuera.push(fijacion.costaleroId)
      }
    }

    if (fijadosDentro.length > K) {
      throw errorFijacionImposible(
        trabajadera.id,
        orden,
        `hay ${fijadosDentro.length} costaleros fijados debajo y sólo caben ${K}`,
      )
    }

    if (fijadosFuera.length > descansosPorTramo) {
      throw errorFijacionImposible(
        trabajadera.id,
        orden,
        `hay ${fijadosFuera.length} costaleros fijados fuera y sólo descansan ${descansosPorTramo}`,
      )
    }

    for (const costaleroId of fijadosFuera) {
      if (estado.get(costaleroId)!.descansosSeguidos >= M) {
        throw errorFijacionImposible(
          trabajadera.id,
          orden,
          `el costalero ${costaleroId} superaría ${M} tramos seguidos fuera`,
        )
      }
    }

    const esPrimerTramo = orden === 1

    if (esPrimerTramo) {
      // La sombra de R7: lo que descansa en el primer tramo vuelve a entrar en
      // el último, así que tampoco puede descansar ahí más gente de la que
      // cabe bajo el paso.
      const nivel1Fuera = fijadosFuera.filter((id) => nivelPorId.get(id) === 1).length
      const nivel3Fuera = fijadosFuera.filter((id) => nivelPorId.get(id) === 3).length

      if (nivel1Fuera > MAX_COSTALEROS_NIVEL_1_DEBAJO || nivel3Fuera > MAX_COSTALEROS_NIVEL_3_DEBAJO) {
        throw errorFijacionImposible(
          trabajadera.id,
          orden,
          'las fijaciones del primer tramo no dejan sitio bajo el paso para el último',
        )
      }
    }

    // 1. Quién tiene que volver a entrar porque alcanzó la racha máxima de
    //    descansos (R3): es obligatorio.
    const forzados = new Set<string>()

    for (const persona of grupo) {
      if (estado.get(persona.id)!.descansosSeguidos >= M) {
        forzados.add(persona.id)
      }
    }

    // 2. En el último tramo de su trabajadera vuelve a entrar quien descansó
    //    en el primero (R7): es obligatorio, como la racha máxima de R3.
    const vuelven = new Set<string>()

    if (trabajadera.tramos > 1 && orden === trabajadera.tramos) {
      for (const costaleroId of descansaronEnElPrimerTramo) {
        if (fijadosFuera.includes(costaleroId)) {
          throw errorFijacionImposible(
            trabajadera.id,
            orden,
            `el costalero ${costaleroId} salió fuera en el primer tramo y no puede repetir fuera en el último`,
          )
        }

        vuelven.add(costaleroId)
      }
    }

    // Los fijados dentro y los que vuelven están bajo el paso; los fijados
    // fuera descansan y no pueden ser candidatos a descansar.
    const bajoObligatorio = new Set<string>([...fijadosDentro, ...forzados, ...vuelven])
    const descansanFijos = new Set<string>(fijadosFuera)

    // 3. Del resto, descansa primero quien menos ha descansado en total.
    const candidatos = grupo
      .filter((persona) => !bajoObligatorio.has(persona.id) && !descansanFijos.has(persona.id))
      .sort((a, b) => compararPorJusticia(a, b, estado))

    const faltan = descansosPorTramo - fijadosFuera.length

    if (candidatos.length < faltan) {
      throw errorFijacionImposible(
        trabajadera.id,
        orden,
        'las fijaciones y la regla de descansos seguidos impiden completar el reparto',
      )
    }

    // El primer tramo tiene una sombra: quien descansa en él vuelve a entrar
    // en el último (R7), así que los que descansan en el primer tramo quedan
    // bajo el paso en el último. Por eso, en el primer tramo no puede
    // descansar más gente de un nivel de la que cabe bajo el paso.
    const descansan = elegirDescansos(
      candidatos,
      descansosPorTramo,
      minimoNivel1,
      minimoNivel3,
      esPrimerTramo ? MAX_COSTALEROS_NIVEL_1_DEBAJO : Number.POSITIVE_INFINITY,
      esPrimerTramo ? MAX_COSTALEROS_NIVEL_3_DEBAJO : Number.POSITIVE_INFINITY,
      fijadosFuera,
      nivelPorId,
      trabajadera.id,
      orden,
    )

    // 4. Los que quedan debajo se reparten los cinco puestos.
    const bajo = grupo.filter((persona) => !descansan.has(persona.id))
    const asignaciones = repartirPuestos(bajo, trabajadera.id, orden)

    for (const persona of grupo) {
      const suyo = estado.get(persona.id)!

      if (descansan.has(persona.id)) {
        suyo.descansos += 1
        suyo.descansosSeguidos += 1
        suyo.bajo = 0
      } else {
        suyo.descansosSeguidos = 0
        suyo.bajo += 1
      }
    }

    if (orden === 1) {
      descansaronEnElPrimerTramo = [...descansan].sort()
    }

    plan.set(orden, asignaciones)
  }

  return plan
}

/**
 * Elige quién descansa en un tramo.
 *
 * Primero se aplican las cotas de la jerarquía de alturas, dentro de cada nivel
 * con el orden por justicia; después se completa el reparto por justicia.
 *
 * `maximoNivel1` y `maximoNivel3` son los topes de descansantes de cada nivel
 * en este tramo: en el primer tramo son los de la sombra de R7 (quien descansa
 * en el primero vuelve a entrar en el último, así que no puede descansar ahí
 * más gente de la que cabe bajo el paso); en los demás tramos no hay tope.
 *
 * Quien tiene que estar debajo del paso (por la racha máxima de R3 o por la
 * regla R7) no llega aquí: ya está descartado de los candidatos.
 */
function elegirDescansos(
  candidatos: Costalero[],
  descansosPorTramo: number,
  minimoNivel1: number,
  minimoNivel3: number,
  maximoNivel1: number,
  maximoNivel3: number,
  fijadosFuera: string[],
  nivelPorId: Map<string, number>,
  trabajaderaId: string,
  orden: number,
): Set<string> {
  // Los que están fijados fuera ya descansan: cuentan desde el principio.
  const descansan = new Set<string>(fijadosFuera)

  for (const [nivel, minimo, maximo] of [
    [1, minimoNivel1, maximoNivel1],
    [3, minimoNivel3, maximoNivel3],
  ] as const) {
    if (minimo > maximo) {
      throw errorImposible(
        trabajaderaId,
        orden,
        'no hay suficientes costaleros de otros niveles para respetar la jerarquía de alturas',
      )
    }

    const delNivel = candidatos.filter((persona) => nivelDe(persona) === nivel)

    let descansadosDelNivel = descansadosDeNivel(descansan, nivelPorId, nivel)

    for (const candidato of delNivel) {
      if (descansadosDelNivel >= minimo) {
        break
      }

      if (descansan.has(candidato.id)) {
        continue
      }

      descansan.add(candidato.id)
      descansadosDelNivel += 1
    }

    if (descansadosDelNivel < minimo) {
      throw errorImposible(trabajaderaId, orden, 'no se pueden respetar los niveles de altura')
    }
  }

  const restantes = candidatos.filter((persona) => !descansan.has(persona.id))

  for (const candidato of restantes) {
    if (descansan.size >= descansosPorTramo) {
      break
    }

    const nivel = nivelDe(candidato)
    const maximo =
      nivel === 1 ? maximoNivel1 : nivel === 3 ? maximoNivel3 : Number.POSITIVE_INFINITY

    if (descansadosDeNivel(descansan, nivelPorId, nivel) >= maximo) {
      continue
    }

    descansan.add(candidato.id)
  }

  if (descansan.size !== descansosPorTramo) {
    throw errorImposible(trabajaderaId, orden, 'no se puede completar el reparto de descansos')
  }

  return descansan
}

/**
 * Cuántos de los que descansan en este tramo son de un nivel dado.
 */
function descansadosDeNivel(
  descansan: Set<string>,
  nivelPorId: Map<string, number>,
  nivel: number,
): number {
  let total = 0

  for (const costaleroId of descansan) {
    if (nivelPorId.get(costaleroId) === nivel) {
      total += 1
    }
  }

  return total
}

/**
 * Orden de justicia: descansa primero quien menos ha descansado en total; a
 * igualdad, quien más tramos seguidos lleva debajo del paso; a igualdad, el
 * identificador más pequeño.
 */
function compararPorJusticia(
  a: Costalero,
  b: Costalero,
  estado: Map<string, EstadoCostalero>,
): number {
  const estadoA = estado.get(a.id)!
  const estadoB = estado.get(b.id)!

  if (estadoA.descansos !== estadoB.descansos) {
    return estadoA.descansos - estadoB.descansos
  }

  if (estadoA.bajo !== estadoB.bajo) {
    return estadoB.bajo - estadoA.bajo
  }

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Reparte los puestos de la trabajadera entre los costaleros que van debajo.
 *
 * Minimiza el coste: 0 si el puesto es el de su rol natural, 1 si es del mismo
 * nivel y 2 si es de otro nivel permitido. Un nivel 1 nunca ocupa un puesto de
 * nivel 3 ni al revés. A igualdad de coste gana la asignación con el
 * identificador más pequeño.
 */
function repartirPuestos(
  bajo: Costalero[],
  trabajaderaId: string,
  orden: number,
): AsignacionCostalero[] {
  const reparto = buscarReparto(bajo)

  if (reparto === null) {
    throw errorImposible(
      trabajaderaId,
      orden,
      'no se pueden cubrir los puestos con la jerarquía de alturas',
    )
  }

  return bajo.map((persona, indice) => ({
    costaleroId: persona.id,
    trabajaderaId: trabajaderaId,
    puesto: reparto[indice],
  }))
}

/**
 * Busca el reparto de puestos de menor coste.
 *
 * Los costaleros se recorren por identificador y los puestos en el orden de
 * `PUESTOS_TRABAJADERA`: el primer reparto de coste mínimo que aparece es,
 * por tanto, el de identificador más pequeño.
 */
function buscarReparto(bajo: Costalero[]): PuestoCostalero[] | null {
  const mejor = { coste: Number.POSITIVE_INFINITY, reparto: null as PuestoCostalero[] | null }
  const usados = new Array<boolean>(PUESTOS_TRABAJADERA.length).fill(false)
  const actual: PuestoCostalero[] = []

  const visitar = (indice: number, coste: number): void => {
    if (coste > mejor.coste) {
      return
    }

    if (indice === bajo.length) {
      if (coste < mejor.coste) {
        mejor.coste = coste
        mejor.reparto = [...actual]
      }

      return
    }

    const persona = bajo[indice]

    for (let puesto = 0; puesto < PUESTOS_TRABAJADERA.length; puesto += 1) {
      if (usados[puesto]) {
        continue
      }

      const costeElegido = costeDelPuesto(persona, PUESTOS_TRABAJADERA[puesto])

      if (costeElegido === null) {
        continue
      }

      usados[puesto] = true
      actual.push(PUESTOS_TRABAJADERA[puesto])
      visitar(indice + 1, coste + costeElegido)
      actual.pop()
      usados[puesto] = false
    }
  }

  visitar(0, 0)

  return mejor.reparto
}

/**
 * Coste de que un costalero ocupe un puesto: 0 si es el de su rol natural, 1 si
 * es del mismo nivel y 2 si es de otro nivel permitido. `null` si el puesto no
 * le está permitido.
 */
function costeDelPuesto(persona: Costalero, puesto: PuestoCostalero): number | null {
  const nivel = nivelDe(persona)
  const nivelDelPuesto = NIVEL_ROL[puesto]

  if ((nivel === 1 && nivelDelPuesto === 3) || (nivel === 3 && nivelDelPuesto === 1)) {
    return null
  }

  if (persona.rol === puesto) {
    return 0
  }

  return nivel === nivelDelPuesto ? 1 : 2
}

/** Nivel de altura del rol de un costalero. */
function nivelDe(persona: Costalero): number {
  return NIVEL_ROL[persona.rol]
}

/** Identificador del punto del recorrido de un tramo; si no hay, el del propio tramo. */
function puntoIdDelTramo(orden: number, puntos?: PuntoDeRelevo[]): string {
  if (!puntos || puntos.length === 0) {
    return `tramo-${orden}`
  }

  const punto = puntos.find((candidato) => candidato.orden === orden)

  return punto ? punto.id : `tramo-${orden}`
}

/** Error de dominio para los repartes que no se pueden cerrar. */
function errorImposible(trabajaderaId: string, orden: number, motivo: string): ErrorDeDominio {
  return new ErrorDeDominio(
    CODIGO_ROTACION_IMPOSIBLE,
    `${MENSAJE_ROTACION_IMPOSIBLE} Trabajadera ${trabajaderaId}, tramo ${orden}: ${motivo}.`,
  )
}

/** Error de dominio para una fijación que no se puede aplicar. */
function errorFijacion(motivo: string): ErrorDeDominio {
  return new ErrorDeDominio(CODIGO_FIJACION_INVALIDA, `${MENSAJE_FIJACION_INVALIDA} ${motivo}.`)
}

/** Error de dominio para un reparto que no puede respetar las fijaciones. */
function errorFijacionImposible(
  trabajaderaId: string,
  orden: number,
  motivo: string,
): ErrorDeDominio {
  return new ErrorDeDominio(
    CODIGO_FIJACION_IMPOSIBLE,
    `${MENSAJE_FIJACION_IMPOSIBLE} Trabajadera ${trabajaderaId}, tramo ${orden}: ${motivo}.`,
  )
}
