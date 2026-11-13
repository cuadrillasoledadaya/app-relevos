import Link from 'next/link'

import type { Step } from './types'

/** Presents one step as a large, phone-friendly link. */
export function StepCard({ step }: { step: Step }) {
  const workingPositionCount = step.workingPositions.length
  const positionLabel =
    workingPositionCount === 1 ? 'posición de trabajo' : 'posiciones de trabajo'
  const brotherhood = step.brotherhood?.trim() || 'Hermandad no indicada'

  return (
    <Link
      className="flex min-h-11 min-w-0 flex-col gap-2 rounded-2xl border border-hueso/15 bg-tinta-900 p-4 transition hover:border-oro/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro"
      href={`/pasos/${encodeURIComponent(String(step.id))}`}
    >
      <span className="break-words text-xl font-bold leading-tight text-hueso">{step.name}</span>
      <span className="break-words text-sm text-hueso/75">{brotherhood}</span>
      <span className="mt-1 text-sm font-semibold text-oro">
        {workingPositionCount} {positionLabel}
      </span>
    </Link>
  )
}
