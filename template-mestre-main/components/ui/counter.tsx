'use client'

import { Minus, Plus } from '@/components/ui/icons'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Contador interativo com botões de + / - e número animado.
 * Reutilizável para quantidade, estoque, etc.
 */
export function Counter({
  defaultValue = 0,
  min = 0,
  max = 99,
  step = 1,
  className,
}: {
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const [direction, setDirection] = useState(1)

  const update = (next: number, dir: number) => {
    const clamped = Math.min(max, Math.max(min, next))
    if (clamped === value) return
    setDirection(dir)
    setValue(clamped)
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => update(value - step, -1)}
        disabled={value <= min}
        aria-label="Diminuir"
        className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <div className="relative grid h-9 w-12 place-items-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: direction * 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: direction * -20, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute text-lg font-semibold tabular-nums text-foreground"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => update(value + step, 1)}
        disabled={value >= max}
        aria-label="Aumentar"
        className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
