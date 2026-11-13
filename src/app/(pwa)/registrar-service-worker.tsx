'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker y avisa a la app cuando el navegador pide
 * vaciar la cola de escrituras pendientes (Background Sync).
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const registrar = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (error) {
        console.error('No se pudo registrar el service worker', error)
      }
    }

    const alPedirSincronizacion = (evento: MessageEvent) => {
      if (evento.data?.type === 'SYNC_REQUEST') {
        window.dispatchEvent(new CustomEvent('cuadrilla:sync-pendiente'))
      }
    }

    registrar()
    navigator.serviceWorker.addEventListener('message', alPedirSincronizacion)

    return () => {
      navigator.serviceWorker.removeEventListener('message', alPedirSincronizacion)
    }
  }, [])

  return null
}
