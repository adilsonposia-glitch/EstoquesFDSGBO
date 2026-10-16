'use client'

import { useEffect, type RefObject } from 'react'

export function useClickOutside(
  ref: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return
    const refs = Array.isArray(ref) ? ref : [ref]
    function onPointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (refs.some((item) => item.current?.contains(target))) return
      handler()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') handler()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, handler, enabled])
}
