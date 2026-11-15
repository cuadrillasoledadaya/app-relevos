'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { extractList, normalizeStepList } from './data'
import { guardarLectura, leerLectura } from './offline-client'
import { StepCard } from './step-card'
import type { Step } from './types'

/** Shows the cached step list first and refreshes it from the API. */
export function StepsScreen() {
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasCachedData, setHasCachedData] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadSteps = async () => {
      try {
        const cached = await leerLectura<unknown>('pasos')

        if (isActive && Array.isArray(cached)) {
          setSteps(normalizeStepList(cached))
          setHasCachedData(true)
          setIsLoading(false)
        }
      } catch {
        // A cache failure must not prevent the network refresh.
      }

      try {
        const response = await fetch('/api/pasos', { cache: 'no-store' })

        if (!response.ok) throw new Error('The steps request failed')

        const payload = (await response.json()) as unknown
        const documents = extractList<unknown>(payload)

        if (isActive) {
          setSteps(normalizeStepList(documents))
          setHasCachedData(false)
          setRefreshFailed(false)
        }

        try {
          await guardarLectura('pasos', documents)
        } catch {
          // The online list remains usable even if it cannot be cached.
        }
      } catch {
        if (isActive) {
          setSteps((current) => current ?? [])
          setRefreshFailed(true)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadSteps()

    return () => {
      isActive = false
    }
  }, [])

  const showEmptyState = steps !== null && steps.length === 0

  return (
    <section className="min-w-0" aria-labelledby="steps-title">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-hueso" id="steps-title">
          Pasos
        </h1>
        <p className="mt-1 text-sm text-hueso/70">Elige un paso para ver sus puestos y relevos.</p>
      </div>

      <nav className="mb-5" aria-label="Secciones de la cuadrilla">
        <Link
          className="inline-flex min-h-11 items-center rounded-xl border border-oro/50 px-4 py-2 font-semibold text-oro-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro"
          href="/relevos"
        >
          Ver todos los relevos →
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

      {isLoading && steps === null ? (
        <div className="rounded-2xl border border-hueso/15 bg-tinta-900 p-4 text-hueso/70">
          Cargando pasos…
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="rounded-2xl border border-dashed border-hueso/25 bg-tinta-900 p-5">
          <h2 className="text-lg font-bold text-hueso">Todavía no hay pasos.</h2>
          <p className="mt-2 text-hueso/70">
            Los pasos se crean en el panel de administración.
          </p>
        </div>
      ) : null}

      {steps && steps.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3">
          {steps.map((step) => (
            <li key={String(step.id)}>
              <StepCard step={step} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
