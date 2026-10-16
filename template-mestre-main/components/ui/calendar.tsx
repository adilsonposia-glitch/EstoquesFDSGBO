'use client'

import { ChevronLeft, ChevronRight } from '@/components/ui/icons'
import { useState } from 'react'
import {
  formatMonthYear,
  getCalendarDays,
  isSameDay,
  isSameMonth,
  isWithin,
  WEEKDAYS_PT,
  type DateRange,
} from '@/lib/date-presets'
import { cn } from '@/lib/utils'

type CalendarProps = {
  /** Mês inicialmente exibido. */
  defaultMonth?: Date
  /** Intervalo selecionado para destacar. */
  range?: Partial<DateRange>
  /** Disparado ao clicar em um dia. */
  onSelectDate?: (date: Date) => void
  className?: string
}

export function Calendar({
  defaultMonth,
  range,
  onSelectDate,
  className,
}: CalendarProps) {
  const [month, setMonth] = useState<Date>(
    () => defaultMonth ?? range?.from ?? new Date(),
  )
  const today = new Date()
  const days = getCalendarDays(month)

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  return (
    <div className={cn('w-full select-none', className)}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {formatMonthYear(month)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => shiftMonth(-1)}
            className="grid size-7 place-items-center rounded-lg text-primary transition-colors hover:bg-primary-soft"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => shiftMonth(1)}
            className="grid size-7 place-items-center rounded-lg text-primary transition-colors hover:bg-primary-soft"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-y-1">
        {WEEKDAYS_PT.map((w) => (
          <span
            key={w}
            className="grid h-8 place-items-center text-xs font-medium text-muted-foreground"
          >
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, month)
          const isToday = isSameDay(day, today)
          const isFrom = range?.from && isSameDay(day, range.from)
          const isTo = range?.to && isSameDay(day, range.to)
          const inRange =
            range?.from &&
            range?.to &&
            isWithin(day, range.from, range.to)
          const isEdge = isFrom || isTo

          return (
            <div
              key={i}
              className={cn(
                'relative grid h-9 place-items-center',
                // fundo contínuo do intervalo
                inRange && 'bg-primary-soft',
                isFrom && range?.to && 'rounded-l-lg bg-primary-soft',
                isTo && range?.from && 'rounded-r-lg bg-primary-soft',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate?.(day)}
                className={cn(
                  'grid size-9 place-items-center rounded-lg text-sm transition-colors',
                  inMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground/40',
                  !isEdge && !inRange && 'hover:bg-muted',
                  isToday && !isEdge && 'font-semibold text-primary',
                  isEdge &&
                    'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                )}
              >
                {day.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
