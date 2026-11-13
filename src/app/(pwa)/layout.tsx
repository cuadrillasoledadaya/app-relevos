import type { Metadata, Viewport } from 'next'
import React from 'react'

import { BotonInstalar } from './instalar-app'
import { RegistrarServiceWorker } from './registrar-service-worker'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cuadrilla de costaleros',
  description: 'Gestión de pasos, cuadrillas y relevos en el paso',
  applicationName: 'Cuadrilla',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Cuadrilla',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2b1b3d',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="es">
      <body className="min-h-dvh bg-tinta text-hueso antialiased">
        <RegistrarServiceWorker />
        <header className="sticky top-0 z-20 border-b border-hueso/10 bg-tinta/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold tracking-wide text-oro">Cuadrilla</span>
            <BotonInstalar />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">{children}</main>
      </body>
    </html>
  )
}
