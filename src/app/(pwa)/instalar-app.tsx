'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

interface EventoBeforeInstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * El detector de iOS no cambia mientras la app está abierta, así que la
 * suscripción es vacía. `useSyncExternalStore` devuelve `false` en el servidor
 * y el valor real en el cliente tras la hidratación: leerlo con `useState`
 * obligaría a fijarlo dentro de un efecto, que provoca renderizados en
 * cascada.
 */
const suscribir = () => () => {}

const detectarIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

const sinIOSEnServidor = () => false

/**
 * Botón de instalación de la PWA. Chrome/Edge disparan `beforeinstallprompt`;
 * en iOS la app se instala desde "Compartir > Añadir a pantalla de inicio", así
 * que ahí se muestra una pista en lugar del botón.
 */
export function BotonInstalar() {
  const [evento, setEvento] = useState<EventoBeforeInstallPrompt | null>(null)
  const esIOS = useSyncExternalStore(suscribir, detectarIOS, sinIOSEnServidor)

  useEffect(() => {
    const alPoderInstalar = (evento: Event) => {
      evento.preventDefault()
      setEvento(evento as EventoBeforeInstallPrompt)
    }

    window.addEventListener('beforeinstallprompt', alPoderInstalar)
    return () => window.removeEventListener('beforeinstallprompt', alPoderInstalar)
  }, [])

  const instalar = async () => {
    if (!evento) return
    await evento.prompt()
    await evento.userChoice
    setEvento(null)
  }

  if (!evento) {
    if (esIOS) {
      return (
        <span className="text-xs text-hueso/60">Añade la app desde «Compartir»</span>
      )
    }
    return null
  }

  return (
    <button
      className="rounded-full border border-oro/50 px-3 py-1 text-xs font-semibold text-oro-claro"
      onClick={instalar}
      type="button"
    >
      Instalar app
    </button>
  )
}
