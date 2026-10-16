'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Toolbar({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="toolbar"
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'grid size-9 place-items-center rounded-lg transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function ToolbarSeparator() {
  return <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
}
