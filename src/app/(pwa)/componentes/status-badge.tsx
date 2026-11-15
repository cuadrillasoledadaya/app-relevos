import type { ReliefStatus } from './types'

const STATUS_LABELS: Record<ReliefStatus, string> = {
  planificado: 'Planificado',
  en_curso: 'En curso',
  completado: 'Completado',
  omitido: 'Omitido',
}

const STATUS_STYLES: Record<ReliefStatus, string> = {
  planificado: 'border-hueso/25 bg-hueso/10 text-hueso',
  en_curso: 'border-oro bg-oro text-tinta-900',
  completado: 'border-emerald-200 bg-emerald-200 text-emerald-950',
  omitido: 'border-stone-300 bg-stone-300 text-stone-950',
}

/** Shows a relief state with a high-contrast label. */
export function StatusBadge({ status }: { status: ReliefStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
