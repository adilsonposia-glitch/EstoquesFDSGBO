export type DateRange = { from: Date; to: Date }

export type DatePresetId =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'last7'
  | 'last15'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'allTime'
  | 'custom'

export const DATE_PRESETS: { id: DatePresetId; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'thisWeek', label: 'Essa semana' },
  { id: 'last7', label: 'Últimos 7 dias' },
  { id: 'last15', label: 'Últimos 15 dias' },
  { id: 'thisMonth', label: 'Este mês' },
  { id: 'lastMonth', label: 'Mês passado' },
  { id: 'thisYear', label: 'Este ano' },
  { id: 'lastYear', label: 'Ano passado' },
  { id: 'allTime', label: 'Todo o período' },
  { id: 'custom', label: 'Personalizado' },
]

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function getPresetRange(id: DatePresetId): DateRange {
  const now = new Date()
  const today = startOfDay(now)

  switch (id) {
    case 'today':
      return { from: today, to: endOfDay(now) }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { from: y, to: endOfDay(y) }
    }
    case 'thisWeek': {
      const from = new Date(today)
      const day = (from.getDay() + 6) % 7 // segunda = 0
      from.setDate(from.getDate() - day)
      return { from, to: endOfDay(now) }
    }
    case 'last7': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { from, to: endOfDay(now) }
    }
    case 'last15': {
      const from = new Date(today)
      from.setDate(from.getDate() - 14)
      return { from, to: endOfDay(now) }
    }
    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from, to: endOfDay(now) }
    }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
      return { from, to }
    }
    case 'thisYear':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) }
    case 'lastYear':
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: endOfDay(new Date(now.getFullYear() - 1, 11, 31)),
      }
    case 'allTime':
      return { from: new Date(2000, 0, 1), to: endOfDay(now) }
    default:
      return { from: today, to: endOfDay(now) }
  }
}

export function formatRange(range: DateRange) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  if (startOfDay(range.from).getTime() === startOfDay(range.to).getTime()) {
    return fmt(range.from)
  }
  return `${fmt(range.from)} — ${fmt(range.to)}`
}

export function toInputValue(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const WEEKDAYS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function formatMonthYear(d: Date) {
  return d
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())
}

/** Retorna uma matriz plana de 42 dias (6 semanas) cobrindo o mês de `month`. */
export function getCalendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay()) // volta até domingo
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function isWithin(day: Date, from: Date, to: Date) {
  const t = startOfDay(day).getTime()
  return t > startOfDay(from).getTime() && t < startOfDay(to).getTime()
}
