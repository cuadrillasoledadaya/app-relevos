'use client'

import { useState } from 'react'

import { encolarEscritura } from './offline-client'
import type { EntityId, ReliefStatus } from './types'

type ActionMessage = {
  tone: 'success' | 'queued' | 'error'
  text: string
}

interface StartReliefButtonProps {
  reliefId: EntityId
  status: ReliefStatus
  onStatusChange?: (status: ReliefStatus) => void
}

/** Starts a relief online, or queues the critical action while offline. */
export function StartReliefButton({
  reliefId,
  status,
  onStatusChange,
}: StartReliefButtonProps) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<ActionMessage | null>(null)

  const updateStatus = (nextStatus: ReliefStatus) => {
    setCurrentStatus(nextStatus)
    onStatusChange?.(nextStatus)
  }

  const queueUpdate = async () => {
    await encolarEscritura({
      url: `/api/relevos/${encodeURIComponent(String(reliefId))}`,
      metodo: 'PATCH',
      cuerpo: { estado: 'en_curso' },
    })
  }

  const startRelief = async () => {
    if (isSubmitting || currentStatus !== 'planificado') return

    setIsSubmitting(true)
    setMessage(null)

    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

    try {
      if (!isOnline) {
        await queueUpdate()
        updateStatus('en_curso')
        setMessage({
          tone: 'queued',
          text: 'En cola: se enviará al recuperar la conexión.',
        })
        return
      }

      try {
        const response = await fetch(`/api/relevos/${encodeURIComponent(String(reliefId))}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'en_curso' }),
        })

        if (!response.ok) {
          setMessage({
            tone: 'error',
            text: 'No se pudo iniciar el relevo. Inténtalo de nuevo.',
          })
          return
        }

        updateStatus('en_curso')
        setMessage({ tone: 'success', text: 'Relevo iniciado.' })
      } catch {
        await queueUpdate()
        updateStatus('en_curso')
        setMessage({
          tone: 'queued',
          text: 'En cola: se enviará al recuperar la conexión.',
        })
      }
    } catch {
      setMessage({
        tone: 'error',
        text: 'No se pudo guardar el cambio. Inténtalo de nuevo.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDisabled = isSubmitting || currentStatus !== 'planificado'
  const buttonLabel =
    currentStatus === 'planificado'
      ? isSubmitting
        ? 'Guardando…'
        : 'Empezar relevo'
      : currentStatus === 'en_curso'
        ? 'Relevo en curso'
        : currentStatus === 'completado'
          ? 'Relevo completado'
          : 'Relevo omitido'

  return (
    <div className="mt-4">
      <button
        className="min-h-11 w-full rounded-xl bg-oro px-4 py-3 font-bold text-tinta-900 transition hover:bg-oro-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro disabled:cursor-not-allowed disabled:bg-hueso/20 disabled:text-hueso/55"
        disabled={isDisabled}
        onClick={() => {
          void startRelief()
        }}
        type="button"
      >
        {buttonLabel}
      </button>
      {message ? (
        <p
          aria-live="polite"
          className={`mt-2 text-sm font-semibold ${
            message.tone === 'error' ? 'text-red-300' : 'text-oro-claro'
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  )
}
