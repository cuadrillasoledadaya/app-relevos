'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import {
  extractDocument,
  extractList,
  normalizeCostaleroList,
  normalizeCrewList,
  normalizeReliefList,
  normalizeStep,
  resolveReliefs,
} from './data'
import { guardarLectura, leerLectura } from './offline-client'
import { ReliefTimeline } from './relief-timeline'
import type { Costalero, Crew, EntityId, Relief, ReliefStatus, Step } from './types'
import { WorkingPositionMap } from './working-position-map'

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) throw new Error(`The request to ${url} failed`)

  return (await response.json()) as unknown
}

function normalizeCachedStep(value: unknown): Step | null {
  if (!value || typeof value !== 'object') return null

  const candidate =
    'docs' in value || 'doc' in value ? extractDocument<unknown>(value) : (value as unknown)

  return normalizeStep(candidate)
}

/** Shows one step, its working positions, and its ordered relief timeline. */
export function StepDetailScreen({ stepId }: { stepId: string }) {
  const [step, setStep] = useState<Step | null>(null)
  const [reliefs, setReliefs] = useState<Relief[] | null>(null)
  const [crews, setCrews] = useState<Crew[]>([])
  const [costaleros, setCostaleros] = useState<Costalero[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasCachedData, setHasCachedData] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)

  useEffect(() => {
    let isActive = true
    const encodedStepId = encodeURIComponent(stepId)
    const stepCacheKey = `paso:${stepId}`
    const reliefCacheKey = `relevos:paso:${stepId}`

    const loadDetail = async () => {
      const cacheResults = await Promise.allSettled([
        leerLectura<unknown>(stepCacheKey),
        leerLectura<unknown>(reliefCacheKey),
        leerLectura<unknown>('cuadrillas'),
        leerLectura<unknown>('costaleros'),
      ])

      if (isActive) {
        const cachedStep = cacheResults[0]
        const cachedReliefs = cacheResults[1]
        const cachedCrews = cacheResults[2]
        const cachedCostaleros = cacheResults[3]
        let cacheWasFound = false

        if (cachedStep.status === 'fulfilled' && cachedStep.value) {
          const normalizedStep = normalizeCachedStep(cachedStep.value)

          if (normalizedStep) {
            setStep(normalizedStep)
            cacheWasFound = true
          }
        }

        if (
          cachedReliefs.status === 'fulfilled' &&
          Array.isArray(cachedReliefs.value)
        ) {
          setReliefs(normalizeReliefList(cachedReliefs.value))
          cacheWasFound = true
        }

        if (cachedCrews.status === 'fulfilled' && Array.isArray(cachedCrews.value)) {
          setCrews(normalizeCrewList(cachedCrews.value))
          cacheWasFound = true
        }

        if (cachedCostaleros.status === 'fulfilled' && Array.isArray(cachedCostaleros.value)) {
          setCostaleros(normalizeCostaleroList(cachedCostaleros.value))
          cacheWasFound = true
        }

        setHasCachedData(cacheWasFound)
        if (cacheWasFound) setIsLoading(false)
      }

      const networkResults = await Promise.allSettled([
        fetchJson(`/api/pasos/${encodedStepId}`),
        fetchJson(`/api/relevos?where[paso][equals]=${encodedStepId}`),
        fetchJson('/api/cuadrillas'),
        fetchJson('/api/costaleros'),
      ])

      if (isActive) {
        let failed = false

        const stepResult = networkResults[0]
        const reliefResult = networkResults[1]
        const crewResult = networkResults[2]
        const costaleroResult = networkResults[3]

        if (stepResult.status === 'fulfilled') {
          const rawStep = extractDocument<unknown>(stepResult.value)
          const normalizedStep = normalizeStep(rawStep)

          if (normalizedStep) setStep(normalizedStep)

          try {
            if (rawStep) await guardarLectura(stepCacheKey, rawStep)
          } catch {
            // Cached data can still be displayed when it cannot be updated.
          }
        } else {
          failed = true
        }

        if (reliefResult.status === 'fulfilled') {
          const documents = extractList<unknown>(reliefResult.value)

          setReliefs(normalizeReliefList(documents))

          try {
            await guardarLectura(reliefCacheKey, documents)
          } catch {
            // Cached data can still be displayed when it cannot be updated.
          }
        } else {
          failed = true
        }

        if (crewResult.status === 'fulfilled') {
          const documents = extractList<unknown>(crewResult.value)

          setCrews(normalizeCrewList(documents))

          try {
            await guardarLectura('cuadrillas', documents)
          } catch {
            // Cached data can still be displayed when it cannot be updated.
          }
        } else {
          failed = true
        }

        if (costaleroResult.status === 'fulfilled') {
          const documents = extractList<unknown>(costaleroResult.value)

          setCostaleros(normalizeCostaleroList(documents))

          try {
            await guardarLectura('costaleros', documents)
          } catch {
            // Cached data can still be displayed when it cannot be updated.
          }
        } else {
          failed = true
        }

        setRefreshFailed(failed)
        setReliefs((current) => current ?? [])
        setIsLoading(false)
      }
    }

    void loadDetail()

    return () => {
      isActive = false
    }
  }, [stepId])

  const resolvedReliefs = useMemo(
    () => resolveReliefs(reliefs ?? [], crews, costaleros, step?.workingPositions ?? []),
    [costaleros, crews, reliefs, step?.workingPositions],
  )

  const updateReliefStatus = (reliefId: EntityId, status: ReliefStatus) => {
    const updatedReliefs = (reliefs ?? []).map((relief) =>
      String(relief.id) === String(reliefId) ? { ...relief, status } : relief,
    )

    setReliefs(updatedReliefs)
    void guardarLectura(`relevos:paso:${stepId}`, updatedReliefs).catch(() => {
      // The visible state remains correct even if the cache update fails.
    })
  }

  return (
    <section className="min-w-0" aria-labelledby="step-detail-title">
      <Link
        className="inline-flex min-h-11 items-center text-sm font-semibold text-oro-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro"
        href="/"
      >
        ← Volver a los pasos
      </Link>

      <header className="mb-6 mt-2">
        <h1 className="break-words text-2xl font-bold text-hueso" id="step-detail-title">
          {step?.name ?? 'Paso'}
        </h1>
        {step ? (
          <p className="mt-1 break-words text-sm text-hueso/70">
            {step.brotherhood?.trim() || 'Hermandad no indicada'}
          </p>
        ) : null}
      </header>

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

      <div className="grid grid-cols-1 gap-8">
        <section aria-labelledby="working-positions-title">
          <h2 className="mb-3 text-xl font-bold text-hueso" id="working-positions-title">
            Puestos de trabajo
          </h2>
          {step ? (
            <WorkingPositionMap workingPositions={step.workingPositions} />
          ) : isLoading ? (
            <div className="rounded-2xl border border-hueso/15 bg-tinta-900 p-4 text-hueso/70">
              Cargando paso…
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-hueso/25 bg-tinta-900 p-4">
              <p className="font-semibold text-hueso">No se encontró este paso.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="relief-timeline-title">
          <h2 className="mb-3 text-xl font-bold text-hueso" id="relief-timeline-title">
            Relevo del paso
          </h2>
          {reliefs === null && isLoading ? (
            <div className="rounded-2xl border border-hueso/15 bg-tinta-900 p-4 text-hueso/70">
              Cargando relevos…
            </div>
          ) : (
            <ReliefTimeline
              onStatusChange={updateReliefStatus}
              reliefs={resolvedReliefs}
            />
          )}
        </section>
      </div>
    </section>
  )
}
