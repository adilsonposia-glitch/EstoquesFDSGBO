'use client'

import { Button } from '@/components/ui/button'
import { ArrowDown, ArrowUp, ChevronsUpDown, Plus, Search } from '@/components/ui/icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const DEFAULT_MIN_WIDTH = 72
const DEFAULT_COL_WIDTH = 160

export type Column<T> = {
  key: string
  header: string
  /** Conteúdo customizado da célula */
  cell?: (row: T) => React.ReactNode
  /** Valor usado para ordenar/buscar (default: row[key]) */
  accessor?: (row: T) => string | number
  sortable?: boolean
  className?: string
  align?: 'left' | 'right' | 'center'
  /** Largura inicial em pixels */
  width?: number
  /** Largura mínima ao redimensionar (default: 72) */
  minWidth?: number
  /** Permite redimensionar esta coluna (default: true quando resizableColumns) */
  resizable?: boolean
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null

type ResizeState = {
  key: string
  startX: number
  startWidth: number
  minWidth: number
}

type DataTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  className?: string
  /** Habilita redimensionamento de colunas por arraste */
  resizableColumns?: boolean
  /** Callback ao clicar em "Adicionar linha". Quando definido, exibe o botão. */
  onAddRow?: () => void
  addRowLabel?: string
}

function defaultAccessor<T>(row: T, key: string): string | number {
  const v = (row as Record<string, unknown>)[key]
  if (typeof v === 'number') return v
  return String(v ?? '')
}

function buildInitialWidths<T>(columns: Column<T>[]) {
  const widths: Record<string, number> = {}
  for (const col of columns) {
    widths[col.key] = col.width ?? DEFAULT_COL_WIDTH
  }
  return widths
}

export function DataTable<T>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Buscar em todas as colunas...',
  pageSize = 8,
  className,
  resizableColumns = true,
  onAddRow,
  addRowLabel = 'Adicionar linha',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(0)
  const [columnWidths, setColumnWidths] = useState(() => buildInitialWidths(columns))
  const resizeRef = useRef<ResizeState | null>(null)

  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev }
      let changed = false
      for (const col of columns) {
        if (next[col.key] == null) {
          next[col.key] = col.width ?? DEFAULT_COL_WIDTH
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [columns])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return
    const { key, startX, startWidth, minWidth } = resizeRef.current
    const nextWidth = Math.max(minWidth, startWidth + (e.clientX - startX))
    setColumnWidths((prev) => ({ ...prev, [key]: nextWidth }))
  }, [])

  const handleMouseUp = useCallback(() => {
    resizeRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  useEffect(() => () => handleMouseUp(), [handleMouseUp])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((row) =>
      columns.some((col) => {
        const value = col.accessor
          ? col.accessor(row)
          : defaultAccessor(row, col.key)
        return String(value).toLowerCase().includes(q)
      }),
    )
  }, [data, columns, query])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return filtered
    const acc = (row: T) =>
      col.accessor ? col.accessor(row) : defaultAccessor(row, col.key)
    return [...filtered].sort((a, b) => {
      const av = acc(a)
      const bv = acc(b)
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv), 'pt-BR')
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const paged = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  function isColumnResizable(col: Column<T>) {
    return resizableColumns && col.resizable !== false
  }

  function startResize(e: React.MouseEvent, col: Column<T>) {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = {
      key: col.key,
      startX: e.clientX,
      startWidth: columnWidths[col.key] ?? col.width ?? DEFAULT_COL_WIDTH,
      minWidth: col.minWidth ?? DEFAULT_MIN_WIDTH,
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function colStyle(col: Column<T>) {
    const width = columnWidths[col.key] ?? col.width ?? DEFAULT_COL_WIDTH
    return { width, minWidth: width, maxWidth: width }
  }

  function colBodyCellClass(colIndex: number) {
    return colIndex < columns.length - 1 ? 'border-r border-border/35' : ''
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      {(searchable || onAddRow) && (
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {searchable && (
            <div className="flex h-10 min-w-0 flex-1 basis-48 items-center gap-2 rounded-xl border border-input bg-background px-3.5 shadow-sm transition-all focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 sm:max-w-xs">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder={searchPlaceholder}
                className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}
          {onAddRow && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddRow}
              className="w-full shrink-0 sm:w-auto"
            >
              <Plus />
              {addRowLabel}
            </Button>
          )}
        </div>
      )}

      <div className="min-w-0 overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-max table-fixed text-sm">
            <colgroup>
              {columns.map((col) => (
                <col key={col.key} style={colStyle(col)} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((col) => {
                  const active = sort?.key === col.key
                  return (
                    <th
                      key={col.key}
                      style={colStyle(col)}
                      className={cn(
                        'relative px-4 py-3 text-left font-medium text-muted-foreground',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className,
                      )}
                    >
                      <div
                        className={cn(
                          'truncate pr-2',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                        )}
                      >
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className={cn(
                              'inline-flex max-w-full items-center gap-1.5 transition-colors hover:text-foreground',
                              active && 'text-foreground',
                              col.align === 'right' && 'flex-row-reverse',
                            )}
                          >
                            <span className="truncate">{col.header}</span>
                            {active ? (
                              sort?.dir === 'asc' ? (
                                <ArrowUp className="size-3.5 shrink-0" />
                              ) : (
                                <ArrowDown className="size-3.5 shrink-0" />
                              )
                            ) : (
                              <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                            )}
                          </button>
                        ) : (
                          <span className="truncate">{col.header}</span>
                        )}
                      </div>
                      {isColumnResizable(col) && (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Redimensionar coluna ${col.header}`}
                          onMouseDown={(e) => startResize(e, col)}
                          className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize touch-none select-none before:absolute before:top-1/2 before:right-0.5 before:h-4 before:w-px before:-translate-y-1/2 before:bg-border/50 hover:before:bg-primary/50 active:before:bg-primary"
                        />
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/35 last:border-0 transition-colors hover:bg-muted/40"
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={col.key}
                        style={colStyle(col)}
                        className={cn(
                          'truncate px-4 py-3 align-middle',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          colBodyCellClass(colIndex),
                        )}
                      >
                        {col.cell
                          ? col.cell(row)
                          : String(defaultAccessor(row, col.key))}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {sorted.length} registro{sorted.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center justify-between gap-1 sm:justify-end">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-border px-2.5 py-1.5 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="px-2 tabular-nums">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded-lg border border-border px-2.5 py-1.5 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  )
}
