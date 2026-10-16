'use client'

import { Check, ChevronsUpDown, Search } from '@/components/ui/icons'
import { FloatingPanel } from '@/components/ui/floating-panel'
import { useMemo, useRef, useState } from 'react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { cn } from '@/lib/utils'

export type ComboboxOption = {
  value: string
  label: string
  description?: string
  leading?: React.ReactNode
}

type ComboboxProps = {
  options: ComboboxOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyText = 'Nenhum resultado encontrado.',
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useClickOutside([anchorRef, panelRef], () => setOpen(false), open)

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    )
  }, [options, query])

  return (
    <div ref={anchorRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          paddingInline: 'var(--field-px)',
          paddingBlock: 'var(--field-py)',
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border border-input bg-background text-sm shadow-sm transition-all outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-ring ring-3 ring-ring/25',
        )}
      >
        {selected?.leading}
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
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
              const isActive = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange?.(option.value)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  {option.leading}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.description && (
                      <span
                        className={cn(
                          'truncate text-xs',
                          isActive
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground',
                        )}
                      >
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isActive && <Check className="ml-auto size-4 shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </FloatingPanel>
    </div>
  )
}
