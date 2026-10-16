'use client'

import { useState } from 'react'
import { DollarSign, ShoppingCart, Users } from '@/components/ui/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import {
  BarChartH,
  ColumnChart,
  DonutChart,
  FunnelChartComp,
  LineAreaChart,
  RadarChartComp,
  RadialGaugeChart,
  SimpleLineChart,
} from '@/components/ui/charts'
import { Combobox } from '@/components/ui/combobox'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  GOALS_RADIAL,
  PERFORMANCE_RADAR,
  PLAN_DISTRIBUTION,
  REVENUE_MONTHLY,
  SALES_FUNNEL,
  TRAFFIC_SOURCES,
  VISITS_WEEKLY,
} from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const SEGMENT_OPTIONS = [
  { value: 'all', label: 'Todos os segmentos' },
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
  { value: 'enterprise', label: 'Enterprise' },
]

export function GraficosView() {
  const [segment, setSegment] = useState('all')

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Filtros</h2>
            <p className="text-xs text-muted-foreground">
              Ajuste o período e o segmento para atualizar os indicadores.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <Combobox
              options={SEGMENT_OPTIONS}
              value={segment}
              onChange={setSegment}
              className="w-full sm:w-52"
            />
            <DateRangePicker className="w-full sm:w-64" />
          </div>
        </div>
      </Card>

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

      {/* Gráficos */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Receita x Despesa"
          description="Comparativo mensal (colunas)"
        >
          <ColumnChart
            data={REVENUE_MONTHLY}
            xKey="mes"
            series={[
              { key: 'receita', name: 'Receita' },
              { key: 'despesa', name: 'Despesa' },
            ]}
          />
        </ChartCard>

        <ChartCard title="Fontes de tráfego" description="Sessões por canal (barras)">
          <BarChartH data={TRAFFIC_SOURCES} yKey="fonte" valueKey="valor" />
        </ChartCard>

        <ChartCard title="Distribuição de planos" description="Participação por plano (rosca)">
          <DonutChart data={PLAN_DISTRIBUTION} nameKey="plano" valueKey="valor" />
        </ChartCard>

        <ChartCard title="Visitas na semana" description="Tendência diária (linha)">
          <SimpleLineChart data={VISITS_WEEKLY} xKey="dia" valueKey="visitas" name="Visitas" />
        </ChartCard>

        <ChartCard
          title="Funil de conversão"
          description="Etapas do funil de vendas (funil)"
        >
          <FunnelChartComp data={SALES_FUNNEL} nameKey="etapa" valueKey="valor" />
        </ChartCard>

        <ChartCard
          title="Metas por área"
          description="Progresso das metas em % (radial)"
        >
          <RadialGaugeChart data={GOALS_RADIAL} nameKey="meta" valueKey="valor" />
        </ChartCard>

        <ChartCard
          title="Desempenho x meta"
          description="Comparativo multi-critério (radar)"
        >
          <RadarChartComp
            data={PERFORMANCE_RADAR}
            criterionKey="criterio"
            series={[
              { key: 'atual', name: 'Atual' },
              { key: 'meta', name: 'Meta' },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Evolução financeira"
          description="Receita e despesa com área (linhas)"
        >
          <LineAreaChart
            data={REVENUE_MONTHLY}
            xKey="mes"
            series={[
              { key: 'receita', name: 'Receita' },
              { key: 'despesa', name: 'Despesa' },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  description,
  className,
  children,
}: {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn('min-w-0 overflow-hidden', className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
  )
}
