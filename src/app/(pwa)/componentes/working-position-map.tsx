import type { WorkingPosition, WorkingPositionType } from './types'

const TYPE_LABELS: Record<WorkingPositionType, string> = {
  centro: 'Centro',
  cruz: 'Cruz',
  tambor: 'Tambor',
  puesto: 'Puesto',
}

/** Shows the working positions of a step, grouped by side. */
export function WorkingPositionMap({ workingPositions }: { workingPositions: WorkingPosition[] }) {
  const leftPositions = workingPositions
    .filter((position) => position.side === 'izquierda')
    .sort((first, second) => first.number - second.number)
  const rightPositions = workingPositions
    .filter((position) => position.side === 'derecha')
    .sort((first, second) => first.number - second.number)

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <WorkingPositionGroup
        positions={leftPositions}
        sideLabel="Lado izquierdo"
        titleId="working-positions-left"
      />
      <WorkingPositionGroup
        positions={rightPositions}
        sideLabel="Lado derecho"
        titleId="working-positions-right"
      />
    </div>
  )
}

interface WorkingPositionGroupProps {
  positions: WorkingPosition[]
  sideLabel: string
  titleId: string
}

/** Presents one side of the working-position map. */
function WorkingPositionGroup({ positions, sideLabel, titleId }: WorkingPositionGroupProps) {
  return (
    <section aria-labelledby={titleId} className="min-w-0">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-oro" id={titleId}>
        {sideLabel}
      </h3>
      {positions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hueso/20 p-3 text-sm text-hueso/65">
          No hay posiciones en este lado.
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-2">
          {positions.map((position) => (
            <li
              className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-xl bg-hueso/10 px-3 py-2"
              key={String(position.id)}
            >
              <span className="font-bold text-hueso">Puesto {position.number}</span>
              <span className="text-right text-sm font-medium text-oro-claro">
                {TYPE_LABELS[position.type]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
