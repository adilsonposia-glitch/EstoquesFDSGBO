import type { ComboboxOption } from '@/components/ui/combobox'

/* ---- Combobox: moedas (inspirado no print de referência) ---- */
export const CURRENCY_OPTIONS: ComboboxOption[] = [
  { value: 'usd', label: 'USD', description: 'Dólar Americano', leading: <Flag code="US" /> },
  { value: 'eur', label: 'EUR', description: 'Euro', leading: <Flag code="EU" /> },
  { value: 'gbp', label: 'GBP', description: 'Libra Esterlina', leading: <Flag code="GB" /> },
  { value: 'jpy', label: 'JPY', description: 'Iene Japonês', leading: <Flag code="JP" /> },
  { value: 'brl', label: 'BRL', description: 'Real Brasileiro', leading: <Flag code="BR" /> },
  { value: 'cad', label: 'CAD', description: 'Dólar Canadense', leading: <Flag code="CA" /> },
  { value: 'aud', label: 'AUD', description: 'Dólar Australiano', leading: <Flag code="AU" /> },
  { value: 'chf', label: 'CHF', description: 'Franco Suíço', leading: <Flag code="CH" /> },
]

function Flag({ code }: { code: string }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
      {code}
    </span>
  )
}

/* ---- MultiSelect: tecnologias ---- */
export const TECH_OPTIONS: ComboboxOption[] = [
  { value: 'react', label: 'React' },
  { value: 'next', label: 'Next.js' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'angular', label: 'Angular' },
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
]

/* ---- Autocomplete: cidades ---- */
export const CITY_SUGGESTIONS = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Brasília',
  'Curitiba',
  'Porto Alegre',
  'Salvador',
  'Recife',
  'Fortaleza',
  'Manaus',
  'Goiânia',
  'Florianópolis',
]

/* ---- DataTable: clientes ---- */
export type Cliente = {
  id: number
  nome: string
  email: string
  empresa: string
  valor: number
  status: 'Ativo' | 'Pendente' | 'Inativo'
  cadastro: string
}

export const CLIENTES: Cliente[] = [
  { id: 1, nome: 'Ana Souza', email: 'ana@acme.com', empresa: 'Acme Ltda', valor: 12500, status: 'Ativo', cadastro: '2026-01-12' },
  { id: 2, nome: 'Bruno Lima', email: 'bruno@globex.com', empresa: 'Globex', valor: 8200, status: 'Pendente', cadastro: '2026-02-03' },
  { id: 3, nome: 'Carla Dias', email: 'carla@initech.com', empresa: 'Initech', valor: 23900, status: 'Ativo', cadastro: '2026-02-21' },
  { id: 4, nome: 'Diego Alves', email: 'diego@umbrella.com', empresa: 'Umbrella', valor: 4300, status: 'Inativo', cadastro: '2025-11-09' },
  { id: 5, nome: 'Elaine Costa', email: 'elaine@stark.com', empresa: 'Stark Inc', valor: 31200, status: 'Ativo', cadastro: '2026-03-15' },
  { id: 6, nome: 'Felipe Rocha', email: 'felipe@wayne.com', empresa: 'Wayne Co', valor: 17600, status: 'Pendente', cadastro: '2026-03-28' },
  { id: 7, nome: 'Gabriela Nunes', email: 'gabi@hooli.com', empresa: 'Hooli', valor: 9800, status: 'Ativo', cadastro: '2026-04-02' },
  { id: 8, nome: 'Hugo Martins', email: 'hugo@piedpiper.com', empresa: 'Pied Piper', valor: 14100, status: 'Ativo', cadastro: '2026-04-19' },
  { id: 9, nome: 'Isabela Reis', email: 'isa@soylent.com', empresa: 'Soylent', valor: 6700, status: 'Inativo', cadastro: '2025-12-30' },
  { id: 10, nome: 'João Pedro', email: 'joao@vehement.com', empresa: 'Vehement', valor: 27400, status: 'Ativo', cadastro: '2026-05-06' },
  { id: 11, nome: 'Karina Melo', email: 'karina@massive.com', empresa: 'Massive', valor: 19300, status: 'Pendente', cadastro: '2026-05-22' },
  { id: 12, nome: 'Lucas Farias', email: 'lucas@dynamic.com', empresa: 'Dynamic', valor: 11200, status: 'Ativo', cadastro: '2026-06-01' },
]

/* ---- Gráficos ---- */
export const REVENUE_MONTHLY = [
  { mes: 'Jan', receita: 42000, despesa: 28000 },
  { mes: 'Fev', receita: 47000, despesa: 30000 },
  { mes: 'Mar', receita: 53000, despesa: 33000 },
  { mes: 'Abr', receita: 49000, despesa: 31000 },
  { mes: 'Mai', receita: 61000, despesa: 35000 },
  { mes: 'Jun', receita: 68000, despesa: 38000 },
]

export const TRAFFIC_SOURCES = [
  { fonte: 'Orgânico', valor: 4200 },
  { fonte: 'Social', valor: 3100 },
  { fonte: 'Direto', valor: 2400 },
  { fonte: 'Referência', valor: 1500 },
]

export const VISITS_WEEKLY = [
  { dia: 'Seg', visitas: 1200 },
  { dia: 'Ter', visitas: 1900 },
  { dia: 'Qua', visitas: 1600 },
  { dia: 'Qui', visitas: 2400 },
  { dia: 'Sex', visitas: 2900 },
  { dia: 'Sáb', visitas: 2100 },
  { dia: 'Dom', visitas: 1700 },
]

export const PLAN_DISTRIBUTION = [
  { plano: 'Free', valor: 540 },
  { plano: 'Pro', valor: 320 },
  { plano: 'Business', valor: 180 },
  { plano: 'Enterprise', valor: 90 },
]

/* ---- Funil de conversão ---- */
export const SALES_FUNNEL = [
  { etapa: 'Visitantes', valor: 12000 },
  { etapa: 'Cadastros', valor: 7400 },
  { etapa: 'Qualificados', valor: 3800 },
  { etapa: 'Propostas', valor: 1600 },
  { etapa: 'Clientes', valor: 720 },
]

/* ---- Radial (medidor de metas) ---- */
export const GOALS_RADIAL = [
  { meta: 'Vendas', valor: 86 },
  { meta: 'Suporte', valor: 72 },
  { meta: 'Marketing', valor: 64 },
  { meta: 'Produto', valor: 48 },
]

/* ---- Radar (desempenho por área) ---- */
export const PERFORMANCE_RADAR = [
  { criterio: 'Velocidade', atual: 120, meta: 110 },
  { criterio: 'Qualidade', atual: 98, meta: 130 },
  { criterio: 'Suporte', atual: 86, meta: 100 },
  { criterio: 'Custo', atual: 99, meta: 90 },
  { criterio: 'Satisfação', atual: 85, meta: 95 },
  { criterio: 'Entrega', atual: 65, meta: 85 },
]
