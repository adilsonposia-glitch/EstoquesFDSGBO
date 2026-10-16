'use client'

import { motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight } from '@/components/ui/icons'
import { Card } from '@/components/ui/card'
import { Odometer } from '@/components/ui/odometer'
import { cn } from '@/lib/utils'

export type StatCardProps = {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  delta?: number
  icon?: React.ReactNode
}

export function StatCard({
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  delta,
  icon,
}: StatCardProps) {
  const positive = (delta ?? 0) >= 0
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            <Odometer
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          </div>
          {delta !== undefined && (
            <div
              className={cn(
                'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                positive
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {Math.abs(delta)}%
            </div>
          )}
        </div>
        {icon && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
          >
            {icon}
          </motion.div>
        )}
      </div>
    </Card>
  )
}
