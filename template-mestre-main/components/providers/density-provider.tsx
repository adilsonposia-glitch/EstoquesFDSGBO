'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_DENSITY,
  type DensityId,
  getDensityPreset,
} from '@/lib/density'

type DensityContextValue = {
  density: DensityId
  setDensity: (id: DensityId) => void
}

const DensityContext = createContext<DensityContextValue | null>(null)

const STORAGE_KEY = 'v0-density'

function applyDensity(id: DensityId) {
  const preset = getDensityPreset(id)
  // Apenas o multiplicador é definido em runtime; as variáveis de padding de
  // cada família (--field-*, --btn-*, --badge-*, --card-*) são derivadas dele
  // via calc() no globals.css, então TODO o sistema reage de uma vez.
  document.documentElement.style.setProperty('--pad-scale', String(preset.scale))
}

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setState] = useState<DensityId>(DEFAULT_DENSITY)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as DensityId | null
    if (stored) {
      setState(stored)
      applyDensity(stored)
    }
  }, [])

  const setDensity = (id: DensityId) => {
    setState(id)
    applyDensity(id)
    window.localStorage.setItem(STORAGE_KEY, id)
  }

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  )
}

export function useDensity() {
  const ctx = useContext(DensityContext)
  if (!ctx) throw new Error('useDensity deve ser usado dentro de DensityProvider')
  return ctx
}
