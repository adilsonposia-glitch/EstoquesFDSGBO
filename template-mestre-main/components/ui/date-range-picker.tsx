'use client'

import { CalendarDays } from '@/components/ui/icons'
import { FloatingPanel } from '@/components/ui/floating-panel'
import { useEffect, useRef, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { useClickOutside } from '@/hooks/use-click-outside'
import {
  DATE_PRESETS,
  formatRange,
  getPresetRange,
  type DatePresetId,
  type DateRange,
} from '@/lib/date-presets'
import { cn } from '@/lib/utils'

type DateRangePickerProps = {
  value?: { preset: DatePresetId; range: DateRange }
  onChange?: (value: { preset: DatePresetId; range: DateRange }) => void
  className?: string
}

const PANEL_WIDTH = 560

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [internal, setInternal] = useState<{
    preset: DatePresetId
    range: DateRange
  }>(() => value ?? { preset: 'last7', range: getPresetRange('last7') })

  // estado de rascunho enquanto o popover está aberto
  const [draftPreset, setDraftPreset] = useState<DatePresetId>(internal.preset)
  const [draftRange, setDraftRange] = useState<Partial<DateRange>>(
    internal.range,
  )

  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useClickOutside([anchorRef, panelRef], () => setOpen(false), open)

  // ao abrir, sincroniza o rascunho
  useEffect(() => {
    if (!open) return
    const sel = value ?? internal
    setDraftPreset(sel.preset)
    setDraftRange(sel.range)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = value ?? internal
  const currentLabel =
    DATE_PRESETS.find((p) => p.id === selected.preset)?.label ?? 'Período'

  function selectPreset(id: DatePresetId) {
    setDraftPreset(id)
    if (id !== 'custom') {
      setDraftRange(getPresetRange(id))
    }
  }

  function selectDate(date: Date) {
    setDraftPreset('custom')
    setDraftRange((prev) => {
      // sem início ou intervalo já completo → começa um novo
      if (!prev.from || (prev.from && prev.to)) {
        return { from: date, to: undefined }
      }
      // já tem início → define o fim (ordenando)
      if (date.getTime() < prev.from.getTime()) {
        return { from: date, to: prev.from }
      }
      return { from: prev.from, to: date }
    })
  }

  function apply() {
    if (!draftRange.from) return
    const to = draftRange.to ?? draftRange.from
    const from = new Date(draftRange.from)
    from.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    const next = { preset: draftPreset, range: { from, to: end } }
    setInternal(next)
    onChange?.(next)
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-background px-3.5 text-sm shadow-sm transition-all outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25',
          open && 'border-ring ring-3 ring-ring/25',
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{currentLabel}</span>
        <span className="hidden truncate text-muted-foreground sm:inline">
          · {formatRange(selected.range)}
        </span>
      </button>

      <FloatingPanel
        open={open}
        anchorRef={anchorRef}
        panelRef={panelRef}
        width={PANEL_WIDTH}
        align="start"
        maxHeight={480}
        className="rounded-2xl shadow-xl sm:flex-row"
      >
        {/* Presets */}
        <div className="flex max-h-72 shrink-0 flex-row gap-1 overflow-x-auto border-b border-border p-2 sm:max-h-none sm:w-44 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
          {DATE_PRESETS.map((preset) => {
            const isActive = draftPreset === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset.id)}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary-soft font-medium text-primary'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Calendário */}
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <Calendar
            defaultMonth={draftRange.from ?? new Date()}
            range={draftRange}
            onSelectDate={selectDate}
          />
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {draftRange.from
                ? formatRange({
                    from: draftRange.from,
                    to: draftRange.to ?? draftRange.from,
                  })
                : 'Selecione as datas'}
            </span>
            <button
              type="button"
              onClick={apply}
              disabled={!draftRange.from}
              className="h-9 shrink-0 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </div>
      </FloatingPanel>
    </div>
  )
}
