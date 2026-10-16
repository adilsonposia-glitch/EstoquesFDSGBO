'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  APP_ZOOM_ROOT_ID,
  DEFAULT_ZOOM,
  resolveZoom,
  type ZoomId,
} from '@/lib/zoom'

export { APP_ZOOM_ROOT_ID }

type ZoomContextValue = {
  zoom: ZoomId
  setZoom: (zoom: ZoomId) => void
  /** Fator numérico aplicado (ex.: 0.9, 1, 1.15). */
  factor: number
}

const ZoomContext = createContext<ZoomContextValue | null>(null)

const STORAGE_KEY = 'v0-zoom'

function applyZoom(id: ZoomId): number {
  const factor = resolveZoom(id, window.innerWidth)
  // Zoom no wrapper do app (não no <html>) para que dialogs portados
  // ao `document.body` fiquem centralizados no viewport visual.
  const root = document.getElementById(APP_ZOOM_ROOT_ID)
  if (root) root.style.setProperty('zoom', String(factor))
  document.documentElement.style.removeProperty('zoom')
  return factor
}

export function ZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoomState] = useState<ZoomId>(DEFAULT_ZOOM)
  const [factor, setFactor] = useState(1)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ZoomId | null
    const initial = stored ?? DEFAULT_ZOOM
    setZoomState(initial)
    setFactor(applyZoom(initial))

    // Reaplica quando a janela muda de tamanho (relevante no modo automático).
    const onResize = () => {
      const current =
        (window.localStorage.getItem(STORAGE_KEY) as ZoomId | null) ??
        DEFAULT_ZOOM
      if (current === 'auto') setFactor(applyZoom(current))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const setZoom = (next: ZoomId) => {
    setZoomState(next)
    setFactor(applyZoom(next))
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <ZoomContext.Provider value={{ zoom, setZoom, factor }}>
      <div id={APP_ZOOM_ROOT_ID} className="min-h-svh">
        {children}
      </div>
    </ZoomContext.Provider>
  )
}

export function useZoom() {
  const ctx = useContext(ZoomContext)
  if (!ctx) throw new Error('useZoom deve ser usado dentro de ZoomProvider')
  return ctx
}
