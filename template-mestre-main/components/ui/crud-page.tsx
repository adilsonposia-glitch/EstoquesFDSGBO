'use client'

import {
  AlertTriangle,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Table as TableIcon,
  Trash2,
} from '@/components/ui/icons'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { type Column, DataTable } from '@/components/ui/data-table'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ViewMode = 'table' | 'card'

type CrudPageProps<T> = {
  /** Nome da tela */
  title: string
  /** Descrição curta abaixo do título */
  description?: string
  /** Registros a exibir */
  data: T[]
  /** Colunas para a visão de tabela */
  columns: Column<T>[]
  /** Renderiza um item na visão de cards. Recebe os botões de ação prontos. */
  renderCard: (row: T, actions: React.ReactNode) => React.ReactNode
  /** Chave única de cada registro (para keys do grid) */
  getRowId: (row: T) => string | number
  /** Placeholder do campo de busca universal */
  searchPlaceholder?: string
  /** Texto do botão de novo registro */
  newLabel?: string
  /** Visão inicial */
  defaultView?: ViewMode

  /* ---- Popup de formulário (compartilhado entre criar e editar) ---- */
  /** Campos do formulário (mesmos inputs para criar/editar, ligados ao estado do pai) */
  form?: React.ReactNode
  /** Desabilita o botão de confirmar (ex.: validação) */
  submitDisabled?: boolean
  /** Rótulo do botão de confirmar */
  submitLabel?: string

  /* ---- Create ---- */
  /** Prepara o formulário para criação (limpar campos) */
  onNew?: () => void
  /** Confirma a criação */
  onCreate?: () => void
  createTitle?: string
  createDescription?: string

  /* ---- Update (habilita a ação de editar quando presente) ---- */
  /** Preenche o formulário com o registro a editar */
  onEdit?: (row: T) => void
  /** Confirma a edição */
  onUpdate?: () => void
  editTitle?: string
  editDescription?: string

  /* ---- Delete (habilita a ação de excluir + confirmação embutida) ---- */
  onDelete?: (row: T) => void
  /** Rótulo do registro mostrado na confirmação (ex.: r.nome) */
  getDeleteLabel?: (row: T) => string
}

type DialogMode = 'create' | 'edit'

function rawValue<T>(row: T, col: Column<T>): string {
  if (col.accessor) return String(col.accessor(row))
  const v = (row as Record<string, unknown>)[col.key]
  return String(v ?? '')
}

export function CrudPage<T>({
  title,
  description,
  data,
  columns,
  renderCard,
  getRowId,
  searchPlaceholder = 'Buscar...',
  newLabel = 'Novo',
  defaultView = 'table',
  form,
  submitDisabled,
  submitLabel = 'Salvar',
  onNew,
  onCreate,
  createTitle,
  createDescription,
  onEdit,
  onUpdate,
  editTitle,
  editDescription,
  onDelete,
  getDeleteLabel,
}: CrudPageProps<T>) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>(defaultView)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<DialogMode>('create')
  const [toDelete, setToDelete] = useState<T | null>(null)

  const canEdit = !!onEdit
  const canDelete = !!onDelete

  // Busca universal: filtra por todas as colunas (mesma base para as 2 visões).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((row) =>
      columns.some((col) => rawValue(row, col).toLowerCase().includes(q)),
    )
  }, [data, columns, query])

  function openCreate() {
    setMode('create')
    onNew?.()
    setOpen(true)
  }

  function openEdit(row: T) {
    setMode('edit')
    onEdit?.(row)
    setOpen(true)
  }

  function handleSubmit() {
    if (mode === 'create') onCreate?.()
    else onUpdate?.()
    setOpen(false)
  }

  function confirmDelete() {
    if (toDelete) onDelete?.(toDelete)
    setToDelete(null)
  }

  // Coluna de ações injetada automaticamente quando há editar/excluir.
  const columnsWithActions = useMemo<Column<T>[]>(() => {
    if (!canEdit && !canDelete) return columns
    return [
      ...columns,
      {
        key: '__actions',
        header: 'Ações',
        align: 'right',
        cell: (row) => (
          <div className="flex justify-end">
            <RowActions
              onEdit={canEdit ? () => openEdit(row) : undefined}
              onDelete={canDelete ? () => setToDelete(row) : undefined}
            />
          </div>
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, canEdit, canDelete])

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* Cabeçalho: nome + descrição + botão Novo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1 sm:max-w-2xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
        <Button onClick={openCreate} className="w-full shrink-0 sm:mt-0.5 sm:w-auto">
          <Plus className="size-4" />
          {newLabel}
        </Button>
      </div>

      {/* Controles: busca universal + alternância tabela/card */}
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-0 flex-1 basis-48 items-center gap-2 rounded-xl border border-input bg-background px-3.5 shadow-sm transition-all focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 sm:max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background p-1">
          <ViewButton
            active={view === 'table'}
            onClick={() => setView('table')}
            label="Tabela"
          >
            <TableIcon className="size-4" />
          </ViewButton>
          <ViewButton
            active={view === 'card'}
            onClick={() => setView('card')}
            label="Cards"
          >
            <LayoutGrid className="size-4" />
          </ViewButton>
        </div>
      </div>

      {/* Conteúdo */}
      {view === 'table' ? (
        <DataTable columns={columnsWithActions} data={filtered} searchable={false} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Nenhum registro encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => (
            <div key={getRowId(row)}>
              {renderCard(
                row,
                canEdit || canDelete ? (
                  <RowActions
                    onEdit={canEdit ? () => openEdit(row) : undefined}
                    onDelete={canDelete ? () => setToDelete(row) : undefined}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>
      )}

      {/* Popup de criação/edição (mesmo formulário) */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={
          mode === 'create' ? (createTitle ?? newLabel) : (editTitle ?? 'Editar')
        }
        description={mode === 'create' ? createDescription : editDescription}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitDisabled}>
              {submitLabel}
            </Button>
          </>
        }
      >
        {form}
      </Dialog>

      {/* Confirmação de exclusão embutida */}
      <Dialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Excluir registro"
        tone="destructive"
        icon={<AlertTriangle className="size-5" aria-hidden />}
        description={
          toDelete && getDeleteLabel ? (
            <>
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-foreground">
                &ldquo;{getDeleteLabel(toDelete)}&rdquo;
              </span>
              ? Esta ação não pode ser desfeita.
            </>
          ) : (
            'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.'
          )
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive-solid" onClick={confirmDelete}>
              Excluir
            </Button>
          </>
        }
      />
    </div>
  )
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar"
          title="Editar"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir"
          title="Excluir"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        'grid size-8 place-items-center rounded-lg transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
