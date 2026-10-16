'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_PALETTE, type PaletteId } from '@/lib/palettes'

type PaletteContextValue = {
  palette: PaletteId
  setPalette: (palette: PaletteId) => void
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

const STORAGE_KEY = 'v0-palette'

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as PaletteId | null
    if (stored) {
      setPaletteState(stored)
      document.documentElement.setAttribute('data-palette', stored)
    }
  }, [])

  const setPalette = (next: PaletteId) => {
    setPaletteState(next)
    document.documentElement.setAttribute('data-palette', next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  )
}

export function usePalette() {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error('usePalette deve ser usado dentro de PaletteProvider')
  return ctx
}
