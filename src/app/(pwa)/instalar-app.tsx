'use client'

import { useEffect, useState } from 'react'

interface EventoBeforeInstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Botón de instalación de la PWA. Chrome/Edge disparan `beforeinstallprompt`;
 * en iOS la app se instala desde "Compartir > Añadir a pantalla de inicio", así
 * que ahí se muestra una pista en lugar del botón.
 */
export function BotonInstalar() {
  const [evento, setEvento] = useState<EventoBeforeInstallPrompt | null>(null)
  const [esIOS, setEsIOS] = useState(false)

  useEffect(() => {
    setEsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))

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
