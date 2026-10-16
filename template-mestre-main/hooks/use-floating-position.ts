'use client'

import { useEffect, useState, type CSSProperties, type RefObject } from 'react'

type UseFloatingPositionOptions = {
  offset?: number
  maxHeight?: number
  /** Largura do painel. Padrão: mesma largura do gatilho. */
  width?: number | 'anchor'
  /**
   * Alinhamento preferido. Com largura fixa, se estourar a tela o painel
   * desliza o mínimo para caber — sem soltar do gatilho.
   */
  align?: 'start' | 'end'
}

/**
 * Posiciona um painel `fixed` no `document.body` colado ao gatilho.
 * Usa getBoundingClientRect (coordenadas visuais).
 */
export function useFloatingPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  {
    offset = 8,
    maxHeight = 256,
    width = 'anchor',
    align = 'start',
  }: UseFloatingPositionOptions = {},
): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties>()

  useEffect(() => {
    if (!open) {
      setStyle(undefined)
      return
    }

    function update() {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const padding = 8
      const viewWidth = window.innerWidth
      const viewHeight = window.innerHeight

      const panelWidth =
        width === 'anchor'
          ? rect.width
          : Math.min(width, viewWidth - padding * 2)

      let left =
        align === 'end' ? rect.right - panelWidth : rect.left

      if (width !== 'anchor') {
        // Cola no gatilho; só desloca o necessário para não sair da tela.
        const startLeft = rect.left
        const endLeft = rect.right - panelWidth
        if (align === 'start') {
          left = startLeft
          if (left + panelWidth > viewWidth - padding) {
            left = Math.max(padding, endLeft)
          }
          if (left < padding) left = padding
        } else {
          left = endLeft
          if (left < padding) {
            left = Math.min(startLeft, viewWidth - panelWidth - padding)
          }
          if (left < padding) left = padding
        }
      }

      const spaceBelow = viewHeight - rect.bottom - padding
      const spaceAbove = rect.top - padding
      // Prefere abrir abaixo; só sobe se realmente não couber.
      const openBelow =
        spaceBelow >= Math.min(200, maxHeight * 0.45) ||
        spaceBelow >= spaceAbove

      const availableHeight = openBelow
        ? spaceBelow - offset
        : spaceAbove - offset
      const height = Math.min(maxHeight, Math.max(availableHeight, 96))

      // Ancora pela borda do input para ficar colado independente da altura real.
      const next: CSSProperties = {
        position: 'fixed',
        left,
        width: panelWidth,
        maxHeight: height,
        zIndex: 100,
      }

      if (openBelow) {
        next.top = rect.bottom + offset
        next.bottom = 'auto'
      } else {
        next.bottom = viewHeight - rect.top + offset
        next.top = 'auto'
      }

      setStyle(next)
    }

    update()
    const raf = requestAnimationFrame(() => {
      update()
      requestAnimationFrame(update)
    })

    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchorRef, open, offset, maxHeight, width, align])

  return style
}
