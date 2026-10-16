'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_RADIUS } from '@/lib/radius'

type RadiusContextValue = {
  radius: number
  setRadius: (radius: number) => void
}

const RadiusContext = createContext<RadiusContextValue | null>(null)

const STORAGE_KEY = 'v0-radius'

function applyRadius(value: number) {
  document.documentElement.style.setProperty('--radius', `${value}rem`)
}

export function RadiusProvider({ children }: { children: React.ReactNode }) {
  const [radius, setRadiusState] = useState<number>(DEFAULT_RADIUS)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const value = Number.parseFloat(stored)
      if (!Number.isNaN(value)) {
        setRadiusState(value)
        applyRadius(value)
      }
    }
  }, [])

  const setRadius = (next: number) => {
    setRadiusState(next)
    applyRadius(next)
    window.localStorage.setItem(STORAGE_KEY, String(next))
  }

  return (
    <RadiusContext.Provider value={{ radius, setRadius }}>
      {children}
    </RadiusContext.Provider>
  )
}

export function useRadius() {
  const ctx = useContext(RadiusContext)
  if (!ctx) throw new Error('useRadius deve ser usado dentro de RadiusProvider')
  return ctx
}
