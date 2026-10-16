'use client'

import { useEffect, useRef } from 'react'
import { useAppPreset } from '@/hooks/use-app-preset'
import type { AppPreset } from '@/lib/preset'

/**
 * Aplica, uma única vez no mount, o preset carregado do banco de dados.
 * Quando `initialPreset` é `null` (banco não configurado), não faz nada e a
 * aplicação mantém o estado vindo do localStorage de cada provider.
 */
export function PresetHydrator({
  initialPreset,
  children,
}: {
  initialPreset: AppPreset | null
  children: React.ReactNode
}) {
  const { applyPreset } = useAppPreset()
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current || !initialPreset) return
    hydrated.current = true
    applyPreset(initialPreset)
  }, [initialPreset, applyPreset])

  return <>{children}</>
}
