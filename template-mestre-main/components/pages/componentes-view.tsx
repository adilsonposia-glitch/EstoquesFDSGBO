'use client'

import {
  ArrowUpRight,
  AtSign,
  Bold,
  Copy,
  DollarSign,
  Italic,
  Link2,
  Pencil,
  Redo2,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Underline,
  Undo2,
  UserCheck,
  UserPlus,
  Users,
} from '@/components/ui/icons'
import Image from 'next/image'
import { useState } from 'react'
import { DemoCard, PageHeader } from '@/components/showcase'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { ContextMenu, type ContextMenuItem } from '@/components/ui/context-menu'
import { Counter } from '@/components/ui/counter'
import { type Column, DataTable } from '@/components/ui/data-table'
import { Flow } from '@/components/ui/flow'
import { Input } from '@/components/ui/input'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Label } from '@/components/ui/label'
import { MaskedInput } from '@/components/ui/masked-input'
import { MultiSelect } from '@/components/ui/multi-select'
import { CircularProgress, Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { StatCard } from '@/components/ui/stat-card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsPanel, TabsTrigger } from '@/components/ui/tabs'
import { Toolbar, ToolbarButton, ToolbarSeparator } from '@/components/ui/toolbar'
import { useToast } from '@/components/ui/toast'
import {
  type Cliente,
  CLIENTES,
  CITY_SUGGESTIONS,
  CURRENCY_OPTIONS,
  TECH_OPTIONS,
} from '@/lib/mock-data'

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusVariant = {
  Ativo: 'success',
  Pendente: 'warning',
  Inativo: 'secondary',
} as const

const columns: Column<Cliente>[] = [
  { key: 'nome', header: 'Cliente', sortable: true, cell: (r) => (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{r.nome}</span>
      <span className="text-xs text-muted-foreground">{r.email}</span>
    </div>
  ) },
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
  {
    key: 'cadastro',
    header: 'Cadastro',
    sortable: true,
    accessor: (r) => r.cadastro,
    cell: (r) =>
      new Date(r.cadastro + 'T00:00:00').toLocaleDateString('pt-BR'),
  },
]

export function ComponentesView() {
  const [clientes, setClientes] = useState(CLIENTES)
  const [currency, setCurrency] = useState('usd')
  const [techs, setTechs] = useState<string[]>(['react', 'next'])
  const [city, setCity] = useState('')
  const [terms, setTerms] = useState(true)
  const [news, setNews] = useState(false)
  const [notif, setNotif] = useState(true)
  const [darkPref, setDarkPref] = useState(false)
  const [marks, setMarks] = useState<string[]>(['bold'])
  const { toast } = useToast()

  const toggleMark = (mark: string) =>
    setMarks((prev) =>
      prev.includes(mark) ? prev.filter((m) => m !== mark) : [...prev, mark],
    )

  const handleAddCliente = () => {
    const nextId = clientes.reduce((max, c) => Math.max(max, c.id), 0) + 1
    setClientes((prev) => [
      ...prev,
      {
        id: nextId,
        nome: 'Novo cliente',
        email: 'novo@empresa.com',
        empresa: 'Nova empresa',
        valor: 0,
        status: 'Pendente',
        cadastro: new Date().toISOString().slice(0, 10),
      },
    ])
  }

  const contextItems: ContextMenuItem[] = [
    {
      label: 'Editar',
      icon: <Pencil />,
      onSelect: () => toast({ title: 'Editar', description: 'Ação de exemplo.' }),
    },
    {
      label: 'Duplicar',
      icon: <Copy />,
      onSelect: () =>
        toast({ title: 'Duplicar', description: 'Ação de exemplo.' }),
    },
    {
      label: 'Excluir',
      icon: <Trash2 />,
      destructive: true,
      separatorBefore: true,
      onSelect: () =>
        toast({
          variant: 'error',
          title: 'Excluído',
          description: 'Item removido (exemplo).',
        }),
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Biblioteca de Componentes"
        description="Componentes reutilizáveis e acessíveis, prontos para montar qualquer tela. Todos seguem a paleta e o tema ativos."
      />

      {/* Cards odômetro */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Receita total"
          value={318000}
          prefix="R$ "
          delta={12.5}
          icon={<DollarSign className="size-5" />}
        />
        <StatCard
          label="Novos clientes"
          value={1284}
          delta={8.2}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Pedidos"
          value={3942}
          delta={-3.1}
          icon={<ShoppingCart className="size-5" />}
        />
      </div>

      {/* Tabela */}
      <DemoCard
        title="Tabela de dados"
        description="Colunas ordenáveis e redimensionáveis, busca, paginação e adição de linhas."
      >
        <DataTable
          columns={columns}
          data={clientes}
          onAddRow={handleAddCliente}
          resizableColumns
        />
      </DemoCard>

      {/* Grid de componentes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DemoCard
          title="Dropdown com busca (Combobox)"
          description="Seleção única com campo de pesquisa, ícone e descrição."
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="moeda">Moeda</Label>
            <Combobox
              options={CURRENCY_OPTIONS}
              value={currency}
              onChange={setCurrency}
              placeholder="Selecione a moeda"
              searchPlaceholder="Pesquisar moeda..."
            />
          </div>
        </DemoCard>

        <DemoCard
          title="Dropdown com busca + multiseleção"
          description="Múltiplas seleções exibidas como chips removíveis."
        >
          <div className="flex flex-col gap-2">
            <Label>Tecnologias</Label>
            <MultiSelect
              options={TECH_OPTIONS}
              value={techs}
              onChange={setTechs}
              placeholder="Selecione as tecnologias"
              searchPlaceholder="Pesquisar..."
            />
          </div>
        </DemoCard>

        <DemoCard
          title="Inputs com máscara"
          description="Formatação automática em tempo real."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>E-mail</Label>
              <MaskedInput
                mask="email"
                placeholder="nome@empresa.com"
                leading={<AtSign className="size-4" />}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Valor (R$)</Label>
              <MaskedInput mask="currency" placeholder="0,00" leading="R$" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>CNPJ</Label>
              <MaskedInput mask="cnpj" placeholder="00.000.000/0000-00" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>CPF</Label>
              <MaskedInput mask="cpf" placeholder="000.000.000-00" />
            </div>
          </div>
        </DemoCard>

        <DemoCard
          title="Autocomplete"
          description="Sugestões conforme você digita (use as setas e Enter)."
        >
          <div className="flex flex-col gap-2">
            <Label>Cidade</Label>
            <Autocomplete
              suggestions={CITY_SUGGESTIONS}
              value={city}
              onChange={setCity}
              placeholder="Digite uma cidade..."
            />
          </div>
        </DemoCard>

        <DemoCard
          title="Checkbox & Toggle"
          description="Controles de seleção e ativação com animação."
        >
          <div className="flex flex-col gap-4">
            <Label className="cursor-pointer">
              <Checkbox checked={terms} onCheckedChange={setTerms} />
              Aceito os termos de uso
            </Label>
            <Label className="cursor-pointer">
              <Checkbox checked={news} onCheckedChange={setNews} />
              Quero receber novidades por e-mail
            </Label>
            <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
              <span className="text-sm font-medium">Notificações push</span>
              <Switch checked={notif} onCheckedChange={setNotif} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
              <span className="text-sm font-medium">Modo de alto contraste</span>
              <Switch checked={darkPref} onCheckedChange={setDarkPref} />
            </div>
          </div>
        </DemoCard>

        <DemoCard
          title="Badges & Seletor de período"
          description="Etiquetas de status e filtro de datas com presets."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Padrão</Badge>
              <Badge variant="soft">Destaque</Badge>
              <Badge variant="success">Ativo</Badge>
              <Badge variant="warning">Pendente</Badge>
              <Badge variant="destructive">Cancelado</Badge>
              <Badge variant="outline">Rascunho</Badge>
              <Badge variant="secondary">Arquivado</Badge>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Período</Label>
              <DateRangePicker />
            </div>
          </div>
        </DemoCard>

        <DemoCard
          title="Notificações (Toast)"
          description="Surgem no canto superior direito e desaparecem sozinhas. Clique para testar."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                toast({
                  variant: 'success',
                  title: 'Salvo com sucesso',
                  description: 'Suas alterações foram aplicadas.',
                })
              }
            >
              Sucesso
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  variant: 'error',
                  title: 'Erro ao salvar',
                  description: 'Não foi possível concluir a operação.',
                })
              }
            >
              Erro
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  variant: 'warning',
                  title: 'Atenção',
                  description: 'Revise os campos antes de continuar.',
                })
              }
            >
              Aviso
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  variant: 'info',
                  title: 'Nova atualização',
                  description: 'A versão 2.0 já está disponível.',
                })
              }
            >
              Info
            </Button>
          </div>
        </DemoCard>

        <DemoCard
          title="Tabs (abas)"
          description="Navegação entre seções com indicador deslizante animado."
          className="lg:col-span-2"
        >
          <Tabs defaultValue="conta">
            <TabsList>
              <TabsTrigger value="conta">Conta</TabsTrigger>
              <TabsTrigger value="seguranca">Segurança</TabsTrigger>
              <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
            </TabsList>
            <TabsPanel>
              <TabsContent value="conta">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tab-nome">Nome de exibição</Label>
                  <Input id="tab-nome" placeholder="Como devemos te chamar?" />
                  <p className="text-muted-foreground">
                    Atualize as informações públicas do seu perfil.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="seguranca">
                <div className="flex flex-col gap-3">
                  <Label className="cursor-pointer">
                    <Checkbox checked={terms} onCheckedChange={setTerms} />
                    Ativar verificação em duas etapas
                  </Label>
                  <p className="text-muted-foreground">
                    Reforce a proteção da sua conta com uma camada extra.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="notificacoes">
                <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
                  <span className="text-sm font-medium">
                    Resumo semanal por e-mail
                  </span>
                  <Switch checked={news} onCheckedChange={setNews} />
                </div>
              </TabsContent>
            </TabsPanel>
          </Tabs>
        </DemoCard>

        {/* Fluxo */}
        <DemoCard
          title="Fluxo (flow)"
          description="Etapas conectadas com estados concluído, ativo e pendente."
          className="lg:col-span-2"
        >
          <Flow
            steps={[
              {
                id: 'cadastro',
                title: 'Cadastro',
                description: 'Dados enviados',
                icon: <UserPlus />,
                status: 'done',
              },
              {
                id: 'verificacao',
                title: 'Verificação',
                description: 'Em análise',
                icon: <UserCheck />,
                status: 'active',
              },
              {
                id: 'pagamento',
                title: 'Pagamento',
                description: 'Aguardando',
                icon: <ShoppingBag />,
                status: 'pending',
              },
              {
                id: 'conclusao',
                title: 'Conclusão',
                description: 'Pendente',
                icon: <ArrowUpRight />,
                status: 'pending',
              },
            ]}
          />
        </DemoCard>

        {/* Progress */}
        <DemoCard
          title="Barras de progresso"
          description="Linear e circular, com animação de entrada."
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Uso de armazenamento</span>
                <span className="text-muted-foreground tabular-nums">72%</span>
              </div>
              <Progress value={72} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Meta mensal</span>
                <span className="text-muted-foreground tabular-nums">45%</span>
              </div>
              <Progress value={45} />
            </div>
            <div className="flex items-center justify-around pt-1">
              <CircularProgress value={86} />
              <CircularProgress value={64} />
            </div>
          </div>
        </DemoCard>

        {/* Loading / Spinner */}
        <DemoCard
          title="Loading (spinner)"
          description="Indicador de carregamento em vários tamanhos e em botões."
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-end gap-6">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="sm" />
                <span className="text-xs text-muted-foreground">Pequeno</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="md" />
                <span className="text-xs text-muted-foreground">Médio</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <span className="text-xs text-muted-foreground">Grande</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="xl" />
                <span className="text-xs text-muted-foreground">Extra</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled>
                <Spinner size="sm" className="text-primary-foreground" />
                Salvando…
              </Button>
              <Button variant="outline" disabled>
                <Spinner size="sm" />
                Processando…
              </Button>
            </div>
          </div>
        </DemoCard>

        {/* Skeleton */}
        <DemoCard
          title="Skeleton (esqueleto)"
          description="Placeholders animados enquanto o conteúdo carrega."
        >
          <div className="flex flex-col gap-5">
            {/* Cabeçalho de perfil */}
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            {/* Linhas de texto */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            {/* Bloco de mídia */}
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </DemoCard>

        {/* Contador */}
        <DemoCard
          title="Contador (stepper)"
          description="Incrementa e decrementa com número animado."
        >
          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <Label>Quantidade</Label>
              <Counter defaultValue={2} min={0} max={20} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Convidados</Label>
              <Counter defaultValue={4} min={1} max={10} />
            </div>
          </div>
        </DemoCard>

        {/* Toolbar */}
        <DemoCard
          title="Toolbox (barra de ferramentas)"
          description="Botões agrupados com separadores e estado ativo."
        >
          <Toolbar>
            <ToolbarButton
              label="Negrito"
              active={marks.includes('bold')}
              onClick={() => toggleMark('bold')}
            >
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Itálico"
              active={marks.includes('italic')}
              onClick={() => toggleMark('italic')}
            >
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Sublinhado"
              active={marks.includes('underline')}
              onClick={() => toggleMark('underline')}
            >
              <Underline className="size-4" />
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton label="Inserir link">
              <Link2 className="size-4" />
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton label="Desfazer">
              <Undo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Refazer">
              <Redo2 className="size-4" />
            </ToolbarButton>
          </Toolbar>
        </DemoCard>

        {/* Menu de contexto */}
        <DemoCard
          title="Menu de contexto (botão direito)"
          description="Clique com o botão direito na área abaixo."
        >
          <ContextMenu items={contextItems}>
            <div className="grid h-32 place-items-center rounded-xl border border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground">
              Clique com o botão direito aqui
            </div>
          </ContextMenu>
        </DemoCard>

        {/* Tipos de card */}
        <DemoCard
          title="Tipos de card"
          description="Variações de cartão para diferentes contextos."
          className="lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card com imagem */}
            <Card className="overflow-hidden p-0">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/card-cover.png"
                  alt="Estação de trabalho minimalista vista de cima"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 320px"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-base">Card com imagem</CardTitle>
                <CardDescription>
                  Capa no topo, ideal para artigos e produtos.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button size="sm" className="w-full">
                  Ver detalhes
                </Button>
              </CardFooter>
            </Card>

            {/* Card de estatística */}
            <Card>
              <CardContent className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Receita
                  </span>
                  <Badge variant="success">+12%</Badge>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-tight tabular-nums">
                    R$ 48,2k
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    vs. mês anterior
                  </p>
                </div>
                <Progress value={68} />
              </CardContent>
            </Card>

            {/* Card de perfil */}
            <Card>
              <CardContent className="flex flex-col items-center gap-3 text-center">
                <Image
                  src="/avatar.png"
                  alt="Foto de Ana Martins"
                  width={56}
                  height={56}
                  className="size-14 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-foreground">Ana Martins</p>
                  <p className="text-xs text-muted-foreground">
                    Product Designer
                  </p>
                </div>
                <div className="flex w-full gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Mensagem
                  </Button>
                  <Button size="sm" className="flex-1">
                    Seguir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DemoCard>
      </div>
    </div>
  )
}
