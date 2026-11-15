'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  createIdIndex,
  extractList,
  normalizeReliefList,
  normalizeStepList,
  relationshipId,
  relationshipName,
} from './data'
import { guardarLectura, leerLectura } from './offline-client'
import { StatusBadge } from './status-badge'
import type { Relief, Step } from './types'

/** Shows every relief, grouped by step and ordered within each step. */
export function ReliefsScreen() {
  const [reliefs, setReliefs] = useState<Relief[] | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasCachedData, setHasCachedData] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadReliefs = async () => {
      const cachedResults = await Promise.allSettled([
        leerLectura<unknown>('relevos'),
        leerLectura<unknown>('pasos'),
      ])

      if (isActive) {
        const cachedReliefs = cachedResults[0]
        const cachedSteps = cachedResults[1]

        if (cachedReliefs.status === 'fulfilled' && Array.isArray(cachedReliefs.value)) {
          setReliefs(normalizeReliefList(cachedReliefs.value))
          setHasCachedData(true)
          setIsLoading(false)
        }

        if (cachedSteps.status === 'fulfilled' && Array.isArray(cachedSteps.value)) {
          setSteps(normalizeStepList(cachedSteps.value))
        }
      }

      const networkResults = await Promise.allSettled([
        fetch('/api/relevos', { cache: 'no-store' }).then(async (response) => {
          if (!response.ok) throw new Error('The reliefs request failed')

          return (await response.json()) as unknown
        }),
        fetch('/api/pasos', { cache: 'no-store' }).then(async (response) => {
          if (!response.ok) throw new Error('The steps request failed')

          return (await response.json()) as unknown
        }),
      ])

      if (isActive) {
        const reliefResult = networkResults[0]
        const stepResult = networkResults[1]
        let failed = false

        if (reliefResult.status === 'fulfilled') {
          const documents = extractList<unknown>(reliefResult.value)

          setReliefs(normalizeReliefList(documents))
          setHasCachedData(false)

          try {
            await guardarLectura('relevos', documents)
          } catch {
            // The online list remains usable even if it cannot be cached.
          }
        } else {
          failed = true
        }

        if (stepResult.status === 'fulfilled') {
          const documents = extractList<unknown>(stepResult.value)

          setSteps(normalizeStepList(documents))

          try {
            await guardarLectura('pasos', documents)
          } catch {
            // The online list remains usable even if it cannot be cached.
          }
        } else {
          failed = true
        }

        setRefreshFailed(failed)
        setReliefs((current) => current ?? [])
        setIsLoading(false)
      }
    }

    void loadReliefs()

    return () => {
      isActive = false
    }
  }, [])

  const stepIndex = createIdIndex(steps)
  const orderedReliefs = [...(reliefs ?? [])].sort((first, second) => {
    const firstStepName = relationshipName(first.step, stepIndex, 'Paso sin nombre')
    const secondStepName = relationshipName(second.step, stepIndex, 'Paso sin nombre')
    const stepComparison = firstStepName.localeCompare(secondStepName, 'es')

    if (stepComparison !== 0) return stepComparison

    if (first.order !== second.order) return first.order - second.order

    return String(first.id).localeCompare(String(second.id), 'es')
  })

  return (
    <section className="min-w-0" aria-labelledby="reliefs-title">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-hueso" id="reliefs-title">
          Relevos
        </h1>
        <p className="mt-1 text-sm text-hueso/70">Todos los relevos de la cuadrilla.</p>
      </div>

      <nav className="mb-5" aria-label="Secciones de la cuadrilla">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold text-oro-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro"
          href="/"
        >
          ← Volver a los pasos
        </Link>
      </nav>

      {refreshFailed ? (
        <p
          className="mb-4 rounded-xl border border-red-300/30 bg-red-950/50 p-3 text-sm font-semibold text-red-200"
          role="status"
        >
          {hasCachedData
            ? 'No se pudo actualizar. Se muestran los datos guardados.'
            : 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.'}
        </p>
      ) : null}

      {isLoading && reliefs === null ? (
        <div className="rounded-2xl border border-hueso/15 bg-tinta-900 p-4 text-hueso/70">
          Cargando relevos…
        </div>
      ) : null}

      {reliefs !== null && orderedReliefs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hueso/25 bg-tinta-900 p-5">
          <h2 className="text-lg font-bold text-hueso">Todavía no hay relevos.</h2>
          <p className="mt-2 text-hueso/70">Los relevos aparecerán aquí cuando estén planificados.</p>
        </div>
      ) : null}

      {orderedReliefs.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3">
          {orderedReliefs.map((relief) => {
            const stepId = relationshipId(relief.step)
            const stepName = relationshipName(relief.step, stepIndex, 'Paso sin nombre')
            const content = (
              <>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="break-words text-lg font-bold text-hueso">{stepName}</span>
                  <span className="text-sm font-semibold text-oro">Relevo {relief.order}</span>
                </div>
                <StatusBadge status={relief.status} />
              </>
            )

            return (
              <li key={String(relief.id)}>
                {stepId ? (
                  <Link
                    className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-hueso/15 bg-tinta-900 p-4 transition hover:border-oro/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro"
                    href={`/pasos/${encodeURIComponent(stepId)}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-hueso/15 bg-tinta-900 p-4">
                    {content}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
