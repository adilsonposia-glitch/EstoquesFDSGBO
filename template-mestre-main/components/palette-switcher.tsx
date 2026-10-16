'use client'

import { Check } from '@/components/ui/icons'
import { motion } from 'motion/react'
import { usePalette } from '@/components/providers/palette-provider'
import { PALETTES } from '@/lib/palettes'
import { cn } from '@/lib/utils'

export function PaletteSwitcher({
  variant = 'grid',
  className,
}: {
  variant?: 'grid' | 'dots'
  className?: string
}) {
  const { palette, setPalette } = usePalette()

  if (variant === 'dots') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
        {PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-label={`Paleta ${p.name}`}
            onClick={() => setPalette(p.id)}
            style={{ backgroundColor: p.swatch }}
            className={cn(
              'size-5 rounded-full ring-offset-2 ring-offset-background transition-all hover:scale-110',
              palette === p.id && 'ring-2 ring-foreground',
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
        className,
      )}
    >
      {PALETTES.map((p) => {
        const active = palette === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPalette(p.id)}
            className={cn(
              'group relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-4 text-sm transition-all',
              active
                ? 'border-primary ring-3 ring-ring/20'
                : 'border-border hover:border-ring/50',
            )}
          >
            <span
              className="grid size-12 place-items-center rounded-full shadow-sm"
              style={{ backgroundColor: p.swatch }}
            >
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-white"
                >
                  <Check className="size-5" strokeWidth={3} />
                </motion.span>
              )}
            </span>
            <span className="font-medium">{p.name}</span>
          </button>
        )
      })}
    </div>
  )
}
