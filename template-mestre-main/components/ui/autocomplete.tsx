'use client'

import { FloatingPanel } from '@/components/ui/floating-panel'
import { useMemo, useRef, useState } from 'react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { cn } from '@/lib/utils'

type AutocompleteProps = {
  suggestions: string[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  maxItems?: number
}

export function Autocomplete({
  suggestions,
  value,
  onChange,
  placeholder = 'Digite para buscar...',
  className,
  maxItems = 6,
}: AutocompleteProps) {
  const [internal, setInternal] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useClickOutside([anchorRef, panelRef], () => setOpen(false), open)

  const current = value ?? internal

  const filtered = useMemo(() => {
    const q = current.trim().toLowerCase()
    if (!q) return []
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, maxItems)
  }, [current, suggestions, maxItems])

  function update(v: string) {
    if (value === undefined) setInternal(v)
    onChange?.(v)
  }

  function pick(v: string) {
    update(v)
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className={cn('relative', className)}>
      <input
        value={current}
        placeholder={placeholder}
        onChange={(e) => {
          update(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || filtered.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => (h + 1) % filtered.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => (h - 1 + filtered.length) % filtered.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            pick(filtered[highlight])
          }
        }}
        style={{
          paddingInline: 'var(--field-px)',
          paddingBlock: 'var(--field-py)',
        }}
        className={cn(
          'flex w-full rounded-xl border border-input bg-background text-sm shadow-sm transition-all outline-none',
          'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25',
        )}
      />
      <FloatingPanel
        open={open && filtered.length > 0}
        anchorRef={anchorRef}
        panelRef={panelRef}
        maxHeight={240}
        className="p-1.5"
      >
        {filtered.map((s, i) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHighlight(i)}
            onClick={() => pick(s)}
            className={cn(
              'flex w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
              i === highlight ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            {s}
          </button>
        ))}
      </FloatingPanel>
    </div>
  )
}
