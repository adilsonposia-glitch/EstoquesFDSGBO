'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type RefObject, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingPosition } from '@/hooks/use-floating-position'
import { cn } from '@/lib/utils'

type FloatingPanelProps = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
  className?: string
  offset?: number
  maxHeight?: number
  width?: number | 'anchor'
  align?: 'start' | 'end'
}

export function FloatingPanel({
  open,
  anchorRef,
  panelRef,
  children,
  className,
  offset,
  maxHeight,
  width,
  align,
}: FloatingPanelProps) {
  const [mounted, setMounted] = useState(false)
  const style = useFloatingPosition(anchorRef, open, {
    offset,
    maxHeight,
    width,
    align,
  })

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && style && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={style}
          className={cn(
            'flex flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-lg',
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
