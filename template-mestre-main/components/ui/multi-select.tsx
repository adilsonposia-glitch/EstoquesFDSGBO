'use client'

import { Check, ChevronsUpDown, Search, X } from '@/components/ui/icons'
import { FloatingPanel } from '@/components/ui/floating-panel'
import { useMemo, useRef, useState } from 'react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { cn } from '@/lib/utils'
import type { ComboboxOption } from './combobox'

type MultiSelectProps = {
  options: ComboboxOption[]
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyText = 'Nenhum resultado encontrado.',
  className,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useClickOutside([anchorRef, panelRef], () => setOpen(false), open)

  const selectedOptions = options.filter((o) => value.includes(o.value))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    )
  }, [options, query])

  function toggle(val: string) {
    if (value.includes(val)) onChange?.(value.filter((v) => v !== val))
    else onChange?.([...value, val])
  }

  return (
    <div ref={anchorRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          paddingInline: 'calc(var(--field-px) - 0.25rem)',
          paddingBlock: 'calc(var(--field-py) - 0.125rem)',
        }}
        className={cn(
          'flex w-full flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background text-sm shadow-sm transition-all outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-ring ring-3 ring-ring/25',
        )}
      >
        {selectedOptions.length === 0 && (
          <span className="px-1 text-muted-foreground">{placeholder}</span>
        )}
        {selectedOptions.map((o) => (
          <span
            key={o.value}
            className="inline-flex items-center gap-1 rounded-md bg-primary-soft py-0.5 pr-1 pl-2 text-xs font-medium text-primary"
          >
            {o.label}
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                toggle(o.value)
              }}
              className="grid size-4 place-items-center rounded-sm hover:bg-primary/20"
            >
              <X className="size-3" />
            </span>
          </span>
        ))}
        <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </button>

      <FloatingPanel open={open} anchorRef={anchorRef} panelRef={panelRef} maxHeight={320}>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </p>
          ) : (
            filtered.map((option) => {
              const isActive = value.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input',
                    )}
                  >
                    {isActive && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {option.leading}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </FloatingPanel>
    </div>
  )
}
