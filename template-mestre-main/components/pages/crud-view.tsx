'use client'

import { Building2, Mail } from '@/components/ui/icons'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { CrudPage } from '@/components/ui/crud-page'
import { type Column } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { type Cliente, CLIENTES } from '@/lib/mock-data'

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusVariant = {
  Ativo: 'success',
  Pendente: 'warning',
  Inativo: 'secondary',
} as const

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Inativo', label: 'Inativo' },
]

const columns: Column<Cliente>[] = [
  {
    key: 'nome',
    header: 'Cliente',
    sortable: true,
    cell: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{r.nome}</span>
        <span className="text-xs text-muted-foreground">{r.email}</span>
      </div>
    ),
  },
  { key: 'empresa', header: 'Empresa', sortable: true },
  {
    key: 'valor',
    header: 'Valor',
    sortable: true,
    align: 'right',
    cell: (r) => <span className="font-medium tabular-nums">{brl(r.valor)}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    cell: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
  },
]

const emptyForm = {
  nome: '',
  email: '',
  empresa: '',
  valor: '',
  status: 'Ativo' as Cliente['status'],
}

export function CrudView() {
  const [clientes, setClientes] = useState<Cliente[]>(CLIENTES)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const { toast } = useToast()

  const isValid = form.nome.trim() !== '' && form.email.trim() !== ''

  function handleNew() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function handleEdit(cliente: Cliente) {
    setEditingId(cliente.id)
    setForm({
      nome: cliente.nome,
      email: cliente.email,
      empresa: cliente.empresa === '—' ? '' : cliente.empresa,
      valor: String(cliente.valor),
      status: cliente.status,
    })
  }

  function handleCreate() {
    const novo: Cliente = {
      id: Date.now(),
      nome: form.nome.trim(),
      email: form.email.trim(),
      empresa: form.empresa.trim() || '—',
      valor: Number(form.valor) || 0,
      status: form.status,
      cadastro: new Date().toISOString().slice(0, 10),
    }
    setClientes((prev) => [novo, ...prev])
    setForm(emptyForm)
    toast({ title: 'Cliente criado', description: `${novo.nome} foi adicionado.` })
  }

  function handleUpdate() {
    if (editingId === null) return
    setClientes((prev) =>
      prev.map((c) =>
        c.id === editingId
          ? {
              ...c,
              nome: form.nome.trim(),
              email: form.email.trim(),
              empresa: form.empresa.trim() || '—',
              valor: Number(form.valor) || 0,
              status: form.status,
            }
          : c,
      ),
    )
    setEditingId(null)
    setForm(emptyForm)
    toast({ title: 'Cliente atualizado', description: `${form.nome} foi salvo.` })
  }

  function handleDelete(cliente: Cliente) {
    setClientes((prev) => prev.filter((c) => c.id !== cliente.id))
    toast({ title: 'Cliente excluído', description: `${cliente.nome} foi removido.` })
  }

  return (
    <CrudPage<Cliente>
      title="Clientes"
      description="Modelo padrão de tela CRUD: cabeçalho, busca universal, alternância tabela/cards e criação em popup."
      data={clientes}
      columns={columns}
      getRowId={(r) => r.id}
      renderCard={(r, actions) => (
        <Card className="h-full">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{r.nome}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  {r.email}
                </p>
              </div>
              <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-4 shrink-0" />
              {r.empresa}
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {brl(r.valor)}
              </span>
              {actions}
            </div>
          </CardContent>
        </Card>
      )}
      searchPlaceholder="Buscar clientes..."
      newLabel="Novo cliente"
      createTitle="Novo cliente"
      createDescription="Preencha os dados para cadastrar um novo cliente."
      editTitle="Editar cliente"
      editDescription="Atualize os dados do cliente."
      submitDisabled={!isValid}
      onNew={handleNew}
      onCreate={handleCreate}
      onEdit={handleEdit}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      getDeleteLabel={(r) => r.nome}
      form={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="crud-nome">Nome</Label>
            <Input
              id="crud-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="crud-email">E-mail</Label>
            <Input
              id="crud-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@empresa.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="crud-empresa">Empresa</Label>
            <Input
              id="crud-empresa"
              value={form.empresa}
              onChange={(e) =>
                setForm((f) => ({ ...f, empresa: e.target.value }))
              }
              placeholder="Nome da empresa"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="crud-valor">Valor (R$)</Label>
              <Input
                id="crud-valor"
                inputMode="numeric"
                value={form.valor}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    valor: e.target.value.replace(/[^0-9]/g, ''),
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Combobox
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(v) =>
                  setForm((f) => ({ ...f, status: v as Cliente['status'] }))
                }
                placeholder="Selecione"
                searchPlaceholder="Buscar status..."
              />
            </div>
          </div>
        </div>
      }
    />
  )
}
