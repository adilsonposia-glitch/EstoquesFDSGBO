'use client'

import { X } from '@/components/ui/icons'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type DialogProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  /** Ícone opcional para confirmações compactas (sem formulário). */
  icon?: ReactNode
  /** Destaque visual para ações destrutivas ou alertas. */
  tone?: 'default' | 'destructive'
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  icon,
  tone = 'default',
}: DialogProps) {
  const hasBody = Boolean(children)
  const isCompact = !hasBody && Boolean(description)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Fecha com Esc e trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-10 flex max-h-[min(90svh,calc(100%-2rem))] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-xl',
              className,
            )}
          >
            {(title || (hasBody && description)) && (
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:gap-4 sm:px-6">
                <div className="min-w-0">
                  {title && (
                    <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                      {title}
                    </h2>
                  )}
                  {hasBody && description && (
                    <p
                      className={cn(
                        'text-sm text-muted-foreground text-pretty',
                        title && 'mt-1',
                      )}
                    >
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            {isCompact && description && (
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-start gap-4">
                  {icon && (
                    <div
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-full',
                        tone === 'destructive'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {icon}
                    </div>
                  )}
                  <p className="pt-0.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {description}
                  </p>
                </div>
              </div>
            )}

            {hasBody && (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {children}
              </div>
            )}

            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-4 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
