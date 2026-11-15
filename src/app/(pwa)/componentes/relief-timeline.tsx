import { StartReliefButton } from './start-relief-button'
import { StatusBadge } from './status-badge'
import type { EntityId, ReliefStatus, ResolvedRelief } from './types'

interface ReliefTimelineProps {
  reliefs: ResolvedRelief[]
  onStatusChange?: (reliefId: EntityId, status: ReliefStatus) => void
}

/** Shows a step's reliefs in their route order. */
export function ReliefTimeline({ reliefs, onStatusChange }: ReliefTimelineProps) {
  const orderedReliefs = [...reliefs].sort((first, second) => first.order - second.order)

  if (orderedReliefs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hueso/25 bg-tinta-900 p-4">
        <p className="font-semibold text-hueso">No hay relevos para este paso.</p>
        <p className="mt-1 text-sm text-hueso/65">El plan de relevos aparecerá aquí.</p>
      </div>
    )
  }

  return (
    <ol className="grid grid-cols-1 gap-4">
      {orderedReliefs.map((relief) => (
        <li key={String(relief.id)}>
          <article className="min-w-0 rounded-2xl border border-hueso/15 bg-tinta-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-hueso">Relevo {relief.order}</h3>
              <StatusBadge status={relief.status} />
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
              <div className="min-w-0 rounded-xl bg-hueso/8 px-3 py-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-hueso/55">
                  Punto de relevo
                </dt>
                <dd className="mt-0.5 break-words font-semibold text-hueso">{relief.pointName}</dd>
              </div>
              <div className="min-w-0 rounded-xl bg-hueso/8 px-3 py-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-hueso/55">
                  Cuadrilla entrante
                </dt>
                <dd className="mt-0.5 break-words font-semibold text-oro-claro">
                  {relief.incomingCrewName}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl bg-hueso/8 px-3 py-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-hueso/55">
                  Cuadrilla saliente
                </dt>
                <dd className="mt-0.5 break-words font-semibold text-hueso">
                  {relief.outgoingCrewName}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <h4 className="text-sm font-bold uppercase tracking-wide text-oro">
                Costaleros por puesto
              </h4>
              {relief.assignments.length === 0 ? (
                <p className="mt-2 text-sm text-hueso/65">Sin asignaciones registradas.</p>
              ) : (
                <ul className="mt-2 grid grid-cols-1 gap-2">
                  {relief.assignments.map((assignment, index) => (
                    <li
                      className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-xl border border-hueso/10 px-3 py-2"
                      key={`${assignment.workingPositionId}-${assignment.costaleroId ?? index}`}
                    >
                      <span className="font-semibold text-hueso">
                        Puesto {assignment.workingPositionNumber ?? assignment.workingPositionId}
                      </span>
                      <span className="min-w-0 break-words text-right text-sm font-medium text-hueso/80">
                        {assignment.costaleroName}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <StartReliefButton
              onStatusChange={(status) => onStatusChange?.(relief.id, status)}
              reliefId={relief.id}
              status={relief.status}
            />
          </article>
        </li>
      ))}
    </ol>
  )
}
