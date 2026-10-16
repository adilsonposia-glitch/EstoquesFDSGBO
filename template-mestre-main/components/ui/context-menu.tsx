'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { cn } from '@/lib/utils'

export type ContextMenuItem = {
  label: string
  icon?: ReactNode
  onSelect?: () => void
  destructive?: boolean
  separatorBefore?: boolean
}

/**
 * Área que abre um menu ao clicar com o botão direito (right-click).
 * Reutilizável em qualquer conteúdo passando os itens do menu.
 */
export function ContextMenu({
  items,
  className,
  children,
}: {
  items: ContextMenuItem[]
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  useClickOutside(ref, () => setPos(null), pos !== null)

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onContextMenu={handleContext}
      className={cn('relative', className)}
    >
      {children}
      <AnimatePresence>
        {pos && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ top: pos.y, left: pos.x }}
            className="absolute z-50 min-w-44 origin-top-left overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-app-md"
          >
            {items.map((item, i) => (
              <div key={item.label}>
                {item.separatorBefore && i > 0 && (
                  <div className="my-1 h-px bg-border" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onSelect?.()
                    setPos(null)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    item.destructive
                      ? 'text-destructive hover:bg-destructive/10'
                      : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {item.icon && (
                    <span className="shrink-0 [&_svg]:size-4">{item.icon}</span>
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
