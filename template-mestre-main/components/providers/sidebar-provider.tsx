'use client'

import { useTheme } from 'next-themes'
import { createContext, useContext, useEffect, useState } from 'react'
import {
  applyShellColors,
  DEFAULT_BACKGROUND_TONE,
  DEFAULT_SIDEBAR_COLOR,
  isSidebarColorId,
  type BackgroundToneId,
  type SidebarColorId,
} from '@/lib/shell-colors'
import {
  DEFAULT_SIDEBAR,
  DEFAULT_SIDEBAR_MENU_EFFECT,
  DEFAULT_SIDEBAR_MODE,
  DEFAULT_SIDEBAR_STYLE,
  type SidebarMenuEffect,
  type SidebarMode,
  type SidebarStyle,
  type SidebarVisibility,
} from '@/lib/sidebar'

type SidebarContextValue = {
  visibility: SidebarVisibility
  setVisibility: (visibility: SidebarVisibility) => void
  style: SidebarStyle
  setStyle: (style: SidebarStyle) => void
  mode: SidebarMode
  setMode: (mode: SidebarMode) => void
  menuEffect: SidebarMenuEffect
  setMenuEffect: (effect: SidebarMenuEffect) => void
  sidebarColor: SidebarColorId
  setSidebarColor: (color: SidebarColorId) => void
  backgroundTone: BackgroundToneId
  setBackgroundTone: (tone: BackgroundToneId) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const VISIBILITY_KEY = 'v0-sidebar'
const STYLE_KEY = 'v0-sidebar-style'
const MODE_KEY = 'v0-sidebar-mode'
const MENU_EFFECT_KEY = 'v0-sidebar-menu-effect'
const SIDEBAR_COLOR_KEY = 'v0-sidebar-color'
const BACKGROUND_TONE_KEY = 'v0-background-tone'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [visibility, setVisibilityState] =
    useState<SidebarVisibility>(DEFAULT_SIDEBAR)
  const [style, setStyleState] = useState<SidebarStyle>(DEFAULT_SIDEBAR_STYLE)
  const [mode, setModeState] = useState<SidebarMode>(DEFAULT_SIDEBAR_MODE)
  const [menuEffect, setMenuEffectState] = useState<SidebarMenuEffect>(
    DEFAULT_SIDEBAR_MENU_EFFECT,
  )
  const [sidebarColor, setSidebarColorState] = useState<SidebarColorId>(
    DEFAULT_SIDEBAR_COLOR,
  )
  const [backgroundTone, setBackgroundToneState] = useState<BackgroundToneId>(
    DEFAULT_BACKGROUND_TONE,
  )

  useEffect(() => {
    const storedVisibility = window.localStorage.getItem(
      VISIBILITY_KEY,
    ) as SidebarVisibility | null
    if (storedVisibility === 'visible' || storedVisibility === 'hidden') {
      setVisibilityState(storedVisibility)
    }
    const storedStyle = window.localStorage.getItem(
      STYLE_KEY,
    ) as SidebarStyle | null
    if (storedStyle === 'flat' || storedStyle === 'floating') {
      setStyleState(storedStyle)
    }
    const storedMode = window.localStorage.getItem(
      MODE_KEY,
    ) as SidebarMode | null
    if (storedMode === 'full' || storedMode === 'compact') {
      setModeState(storedMode)
    }
    const storedMenuEffect = window.localStorage.getItem(
      MENU_EFFECT_KEY,
    ) as SidebarMenuEffect | null
    if (storedMenuEffect === 'fade' || storedMenuEffect === 'slide') {
      setMenuEffectState(storedMenuEffect)
    }
    const storedSidebarColor = window.localStorage.getItem(
      SIDEBAR_COLOR_KEY,
    ) as SidebarColorId | null
    if (storedSidebarColor && isSidebarColorId(storedSidebarColor)) {
      setSidebarColorState(storedSidebarColor)
    }
    const storedBackgroundTone = window.localStorage.getItem(
      BACKGROUND_TONE_KEY,
    ) as BackgroundToneId | null
    if (storedBackgroundTone === 'white' || storedBackgroundTone === 'neutral') {
      setBackgroundToneState(storedBackgroundTone)
    }
  }, [])

  useEffect(() => {
    applyShellColors(sidebarColor, backgroundTone, resolvedTheme === 'dark')
  }, [sidebarColor, backgroundTone, resolvedTheme])

  const setVisibility = (next: SidebarVisibility) => {
    setVisibilityState(next)
    window.localStorage.setItem(VISIBILITY_KEY, next)
  }

  const setStyle = (next: SidebarStyle) => {
    setStyleState(next)
    window.localStorage.setItem(STYLE_KEY, next)
  }

  const setMode = (next: SidebarMode) => {
    setModeState(next)
    window.localStorage.setItem(MODE_KEY, next)
  }

  const setMenuEffect = (next: SidebarMenuEffect) => {
    setMenuEffectState(next)
    window.localStorage.setItem(MENU_EFFECT_KEY, next)
  }

  const setSidebarColor = (next: SidebarColorId) => {
    setSidebarColorState(next)
    window.localStorage.setItem(SIDEBAR_COLOR_KEY, next)
  }

  const setBackgroundTone = (next: BackgroundToneId) => {
    setBackgroundToneState(next)
    window.localStorage.setItem(BACKGROUND_TONE_KEY, next)
  }

  return (
    <SidebarContext.Provider
      value={{
        visibility,
        setVisibility,
        style,
        setStyle,
        mode,
        setMode,
        menuEffect,
        setMenuEffect,
        sidebarColor,
        setSidebarColor,
        backgroundTone,
        setBackgroundTone,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar deve ser usado dentro de SidebarProvider')
  return ctx
}
