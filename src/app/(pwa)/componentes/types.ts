export type EntityId = string | number

export type WorkingSide = 'izquierda' | 'derecha'

export type WorkingPositionType = 'centro' | 'cruz' | 'tambor' | 'puesto'

export type ReliefStatus = 'planificado' | 'en_curso' | 'completado' | 'omitido'

export interface WorkingPosition {
  id: EntityId
  number: number
  side: WorkingSide
  type: WorkingPositionType
}

export interface Step {
  id: EntityId
  name: string
  brotherhood?: string | null
  routeMeters?: number | null
  workingPositions: WorkingPosition[]
}

export interface Crew {
  id: EntityId
  name: string
}

export interface Costalero {
  id: EntityId
  name: string
}

export interface RelatedDocument {
  id?: EntityId
  name?: string
}

export type RelationshipValue = EntityId | RelatedDocument | null | undefined

export interface ReliefAssignment {
  costalero: RelationshipValue
  workingPositionId: EntityId
}

export interface Relief {
  id: EntityId
  step: RelationshipValue
  order: number
  point: RelationshipValue
  incomingCrew: RelationshipValue
  outgoingCrew?: RelationshipValue | null
  status: ReliefStatus
  assignments: ReliefAssignment[]
}

export interface ResolvedAssignment {
  workingPositionId: string
  workingPositionNumber?: number
  costaleroId?: string
  costaleroName: string
}

export interface ResolvedRelief {
  id: EntityId
  stepId?: string
  order: number
  pointName: string
  incomingCrewName: string
  outgoingCrewName: string
  status: ReliefStatus
  assignments: ResolvedAssignment[]
}
