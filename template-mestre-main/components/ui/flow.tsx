'use client'

import { ArrowRight } from '@/components/ui/icons'
import { motion } from 'motion/react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type FlowStep = {
  id: string
  title: string
  description?: string
  icon?: ReactNode
  status?: 'done' | 'active' | 'pending'
}

const statusStyles: Record<NonNullable<FlowStep['status']>, string> = {
  done: 'border-primary/40 bg-primary/5',
  active: 'border-primary bg-primary/10 ring-2 ring-primary/20',
  pending: 'border-border bg-card',
}

const iconStyles: Record<NonNullable<FlowStep['status']>, string> = {
  done: 'bg-primary text-primary-foreground',
  active: 'bg-primary text-primary-foreground',
  pending: 'bg-muted text-muted-foreground',
}

/**
 * Diagrama de fluxo horizontal (em telas pequenas vira vertical).
 * Nós conectados por setas, com estados done/active/pending.
 */
export function Flow({
  steps,
  className,
}: {
  steps: FlowStep[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-stretch gap-3 md:flex-row md:items-center',
        className,
      )}
    >
      {steps.map((step, i) => {
        const status = step.status ?? 'pending'
        return (
          <Fragment key={step.id}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
              className={cn(
                'flex flex-1 items-start gap-3 rounded-xl border p-3',
                statusStyles[status],
              )}
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold [&_svg]:size-4',
                  iconStyles[status],
                )}
              >
                {step.icon ?? i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {step.title}
                </p>
                {step.description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </motion.div>
            {i < steps.length - 1 && (
              <ArrowRight className="mx-auto size-4 shrink-0 rotate-90 text-muted-foreground md:rotate-0" />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
