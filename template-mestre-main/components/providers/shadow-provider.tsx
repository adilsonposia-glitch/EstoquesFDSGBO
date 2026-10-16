'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_SHADOW,
  getShadowPreset,
  type ShadowId,
} from '@/lib/shadows'

type ShadowContextValue = {
  shadow: ShadowId
  setShadow: (shadow: ShadowId) => void
}

const ShadowContext = createContext<ShadowContextValue | null>(null)

const STORAGE_KEY = 'v0-shadow'

function applyShadow(id: ShadowId) {
  const preset = getShadowPreset(id)
  const root = document.documentElement.style
  // Sobrescreve as variáveis de runtime referenciadas pelos tokens --shadow-*
  // (definidas no bloco @theme inline do globals.css). Assim TODOS os
  // utilitários shadow-* do Tailwind passam a refletir o preset escolhido.
  root.setProperty('--app-shadow-sm', preset.sm)
  root.setProperty('--app-shadow-md', preset.md)
  root.setProperty('--app-shadow-lg', preset.lg)
  root.setProperty('--app-shadow-xl', preset.xl)
}

export function ShadowProvider({ children }: { children: React.ReactNode }) {
  const [shadow, setShadowState] = useState<ShadowId>(DEFAULT_SHADOW)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ShadowId | null
    const initial = stored ?? DEFAULT_SHADOW
    setShadowState(initial)
    applyShadow(initial)
  }, [])

  const setShadow = (next: ShadowId) => {
    setShadowState(next)
    applyShadow(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <ShadowContext.Provider value={{ shadow, setShadow }}>
      {children}
    </ShadowContext.Provider>
  )
}

export function useShadow() {
  const ctx = useContext(ShadowContext)
  if (!ctx) throw new Error('useShadow deve ser usado dentro de ShadowProvider')
  return ctx
}
