'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_ICON_SET, type IconSetId } from '@/lib/icon-set'

type IconSetContextValue = {
  iconSet: IconSetId
  setIconSet: (iconSet: IconSetId) => void
}

const IconSetContext = createContext<IconSetContextValue | null>(null)

const STORAGE_KEY = 'v0-icon-set'

export function IconSetProvider({ children }: { children: React.ReactNode }) {
  const [iconSet, setIconSetState] = useState<IconSetId>(DEFAULT_ICON_SET)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as IconSetId | null
    if (stored === 'lucide' || stored === 'hugeicons') {
      setIconSetState(stored)
    }
  }, [])

  const setIconSet = (next: IconSetId) => {
    setIconSetState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <IconSetContext.Provider value={{ iconSet, setIconSet }}>
      {children}
    </IconSetContext.Provider>
  )
}

export function useIconSet() {
  const ctx = useContext(IconSetContext)
  if (!ctx)
    throw new Error('useIconSet deve ser usado dentro de IconSetProvider')
  return ctx
}
