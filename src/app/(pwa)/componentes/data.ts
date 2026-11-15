import type {
  Costalero,
  Crew,
  EntityId,
  RelatedDocument,
  RelationshipValue,
  Relief,
  ResolvedRelief,
  Step,
  WorkingPosition,
} from './types'

/** Extracts a list from a Payload REST response. */
export function extractList<T>(response: unknown): T[] {
  if (!response || typeof response !== 'object') return []

  const docs = (response as { docs?: unknown }).docs

  return Array.isArray(docs) ? (docs as T[]) : []
}

/** Extracts one document from a Payload REST response. */
export function extractDocument<T>(response: unknown): T | null {
  if (!response || typeof response !== 'object') return null

  const payload = response as { docs?: unknown; doc?: unknown }

  if (Array.isArray(payload.docs)) {
    return payload.docs.length > 0 ? (payload.docs[0] as T) : null
  }

  if (payload.docs && typeof payload.docs === 'object') {
    return payload.docs as T
  }

  if (payload.doc && typeof payload.doc === 'object') {
    return payload.doc as T
  }

  return null
}

/** Reads the identifier of a relationship that may be an id or an embedded document. */
export function relationshipId(value: RelationshipValue): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (value && typeof value === 'object') {
    const id = (value as RelatedDocument).id

    if (typeof id === 'string' || typeof id === 'number') return String(id)
  }

  return undefined
}

/** Resolves a relationship name from embedded data or from a previously fetched list. */
export function relationshipName(
  value: RelationshipValue,
  index?: Map<string, { name: string }>,
  fallback = 'Sin asignar',
): string {
  if (value && typeof value === 'object') {
    const embeddedName = (value as RelatedDocument).name

    if (typeof embeddedName === 'string' && embeddedName.trim()) return embeddedName
  }

  const id = relationshipId(value)

  if (id) {
    const indexedName = index?.get(id)?.name

    if (indexedName) return indexedName

    if (typeof value === 'string') return value
  }

  return fallback
}

/** Creates a stable lookup by API identifier. */
export function createIdIndex<T extends { id: EntityId }>(documents: T[]): Map<string, T> {
  return new Map(documents.map((document) => [String(document.id), document]))
}

/** Joins a step and its working positions for assignment resolution. */
export function createWorkingPositionIndex(
  workingPositions: WorkingPosition[],
): Map<string, WorkingPosition> {
  return new Map(workingPositions.map((position) => [String(position.id), position]))
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {}
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function normalizeRelationship(value: unknown): RelationshipValue {
  if (typeof value === 'string' || typeof value === 'number') return value

  if (!value || typeof value !== 'object') return null

  const raw = asRecord(value)
  const id = raw.id
  const name = asOptionalString(raw.nombre) ?? asOptionalString(raw.name)

  return {
    ...(typeof id === 'string' || typeof id === 'number' ? { id } : {}),
    ...(name ? { name } : {}),
  }
}

/** Normalizes one Payload step document into the UI model. */
export function normalizeStep(value: unknown): Step | null {
  const raw = asRecord(value)
  const id = raw.id

  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    (typeof raw.nombre !== 'string' && typeof raw.name !== 'string')
  ) {
    return null
  }

  if (typeof raw.nombre !== 'string' && Array.isArray(raw.workingPositions)) {
    const workingPositions = raw.workingPositions.flatMap<WorkingPosition>((position) => {
      const positionRaw = asRecord(position)
      const positionId = positionRaw.id
      const number = positionRaw.number

      if (
        (typeof positionId !== 'string' && typeof positionId !== 'number') ||
        typeof number !== 'number'
      ) {
        return []
      }

      return [
        {
          id: positionId,
          number,
          side: positionRaw.side === 'derecha' ? 'derecha' : 'izquierda',
          type:
            positionRaw.type === 'cruz' ||
            positionRaw.type === 'tambor' ||
            positionRaw.type === 'puesto'
              ? positionRaw.type
              : 'centro',
        },
      ]
    })

    return {
      id,
      name: raw.name as string,
      brotherhood: asOptionalString(raw.brotherhood) ?? null,
      routeMeters: typeof raw.routeMeters === 'number' ? raw.routeMeters : null,
      workingPositions,
    }
  }

  if (typeof raw.nombre !== 'string') return null

  const workingPositions: WorkingPosition[] = Array.isArray(raw.trabajadoras)
    ? raw.trabajadoras.flatMap<WorkingPosition>((position) => {
        const positionRaw = asRecord(position)
        const positionId = positionRaw.id
        const number = positionRaw.numero

        if (
          (typeof positionId !== 'string' && typeof positionId !== 'number') ||
          typeof number !== 'number'
        ) {
          return []
        }

        return [
          {
            id: positionId,
            number,
            side: positionRaw.lado === 'derecha' ? 'derecha' : 'izquierda',
            type:
              positionRaw.tipo === 'cruz' ||
              positionRaw.tipo === 'tambor' ||
              positionRaw.tipo === 'puesto'
                ? positionRaw.tipo
                : 'centro',
          },
        ]
      })
    : []

  return {
    id,
    name: raw.nombre,
    brotherhood: asOptionalString(raw.hermandad) ?? null,
    routeMeters: typeof raw.recorridoMetros === 'number' ? raw.recorridoMetros : null,
    workingPositions,
  }
}

/** Normalizes one Payload crew document into the UI model. */
export function normalizeCrew(value: unknown): Crew | null {
  const raw = asRecord(value)
  const id = raw.id

  if ((typeof id !== 'string' && typeof id !== 'number') || typeof raw.nombre !== 'string') {
    return null
  }

  return { id, name: raw.nombre }
}

/** Normalizes one Payload costalero document into the UI model. */
export function normalizeCostalero(value: unknown): Costalero | null {
  const raw = asRecord(value)
  const id = raw.id

  if ((typeof id !== 'string' && typeof id !== 'number') || typeof raw.nombre !== 'string') {
    return null
  }

  return { id, name: raw.nombre }
}

/** Normalizes a list of Payload step documents into the UI model. */
export function normalizeStepList(value: unknown): Step[] {
  const documents = Array.isArray(value) ? value : extractList<unknown>(value)

  return documents.flatMap((document) => {
    const step = normalizeStep(document)

    return step ? [step] : []
  })
}

/** Normalizes a list of Payload crew documents into the UI model. */
export function normalizeCrewList(value: unknown): Crew[] {
  const documents = Array.isArray(value) ? value : extractList<unknown>(value)

  return documents.flatMap((document) => {
    const crew = normalizeCrew(document)

    return crew ? [crew] : []
  })
}

/** Normalizes a list of Payload costalero documents into the UI model. */
export function normalizeCostaleroList(value: unknown): Costalero[] {
  const documents = Array.isArray(value) ? value : extractList<unknown>(value)

  return documents.flatMap((document) => {
    const costalero = normalizeCostalero(document)

    return costalero ? [costalero] : []
  })
}

/** Normalizes one Payload relief document into the UI model. */
export function normalizeRelief(value: unknown): Relief | null {
  const raw = asRecord(value)
  const id = raw.id

  if ((typeof id !== 'string' && typeof id !== 'number')) return null

  if ('incomingCrew' in raw) {
    const status = raw.status
    const assignments = Array.isArray(raw.assignments)
      ? raw.assignments.flatMap((assignment) => {
          const assignmentRaw = asRecord(assignment)
          const workingPositionId = assignmentRaw.workingPositionId

          if (typeof workingPositionId !== 'string' && typeof workingPositionId !== 'number') {
            return []
          }

          return [
            {
              costalero: normalizeRelationship(assignmentRaw.costalero),
              workingPositionId,
            },
          ]
        })
      : []

    return {
      id,
      step: normalizeRelationship(raw.step),
      order: typeof raw.order === 'number' ? raw.order : 0,
      point: normalizeRelationship(raw.point),
      incomingCrew: normalizeRelationship(raw.incomingCrew),
      outgoingCrew: normalizeRelationship(raw.outgoingCrew),
      status:
        status === 'en_curso' ||
        status === 'completado' ||
        status === 'omitido' ||
        status === 'planificado'
          ? status
          : 'planificado',
      assignments,
    }
  }

  const status = raw.estado
  const assignments = Array.isArray(raw.asignaciones)
    ? raw.asignaciones.flatMap((assignment) => {
        const assignmentRaw = asRecord(assignment)
        const workingPositionId = assignmentRaw.trabajaderaId

        if (typeof workingPositionId !== 'string' && typeof workingPositionId !== 'number') {
          return []
        }

        return [
          {
            costalero: normalizeRelationship(assignmentRaw.costalero),
            workingPositionId,
          },
        ]
      })
    : []

  return {
    id,
    step: normalizeRelationship(raw.paso),
    order: typeof raw.orden === 'number' ? raw.orden : 0,
    point: normalizeRelationship(raw.punto),
    incomingCrew: normalizeRelationship(raw.cuadrillaEntrante),
    outgoingCrew: normalizeRelationship(raw.cuadrillaSaliente),
    status:
      status === 'en_curso' ||
      status === 'completado' ||
      status === 'omitido' ||
      status === 'planificado'
        ? status
        : 'planificado',
    assignments,
  }
}

/** Normalizes a list of Payload relief documents into the UI model. */
export function normalizeReliefList(value: unknown): Relief[] {
  const documents = Array.isArray(value) ? value : extractList<unknown>(value)

  return documents.flatMap((document) => {
    const relief = normalizeRelief(document)

    return relief ? [relief] : []
  })
}

/** Converts API reliefs into timeline-ready data with resolved names. */
export function resolveReliefs(
  reliefs: Relief[],
  crews: Crew[],
  costaleros: Costalero[],
  workingPositions: WorkingPosition[],
): ResolvedRelief[] {
  const crewIndex = createIdIndex(crews)
  const costaleroIndex = createIdIndex(costaleros)
  const positionIndex = createWorkingPositionIndex(workingPositions)

  return reliefs.map((relief) => ({
    id: relief.id,
    stepId: relationshipId(relief.step),
    order: relief.order,
    pointName: relationshipName(relief.point, undefined, 'Punto sin indicar'),
    incomingCrewName: relationshipName(relief.incomingCrew, crewIndex, 'Cuadrilla sin indicar'),
    outgoingCrewName: relationshipName(
      relief.outgoingCrew,
      crewIndex,
      'Sin cuadrilla saliente',
    ),
    status: relief.status,
    assignments: (relief.assignments ?? []).map((assignment) => {
      const workingPositionId = String(assignment.workingPositionId)
      const costaleroId = relationshipId(assignment.costalero)
      const position = positionIndex.get(workingPositionId)

      return {
        workingPositionId,
        workingPositionNumber: position?.number,
        costaleroId,
        costaleroName: relationshipName(
          assignment.costalero,
          costaleroId ? costaleroIndex : undefined,
          'Costalero sin asignar',
        ),
      }
    }),
  }))
}
