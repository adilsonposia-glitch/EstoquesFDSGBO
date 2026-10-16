'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReactNode } from 'react'

/* ---------- Tokens / paleta de séries ---------- */

function ChartFrame({ children }: { children: ReactNode }) {
  return <div className="h-[280px] w-full min-w-0">{children}</div>
}
const SERIES = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

const axisProps = {
  stroke: 'var(--color-muted-foreground)',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      {label && <p className="mb-1 font-medium text-popover-foreground">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="size-2.5 rounded-full"
              style={{ background: item.color || item.payload?.fill }}
            />
            <span className="capitalize">{item.name}:</span>
            <span className="font-medium text-popover-foreground tabular-nums">
              {item.value.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const animation = {
  isAnimationActive: true,
  animationBegin: 100,
  animationDuration: 1100,
  animationEasing: 'ease-out' as const,
}

/* ---------- Gráfico de Colunas (vertical) ---------- */
export function ColumnChart({
  data,
  xKey,
  series,
  showLabels = true,
}: {
  data: any[]
  xKey: string
  series: { key: string; name: string }[]
  showLabels?: boolean
}) {
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 24, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={SERIES[i % SERIES.length]}
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
            {...animation}
          >
            {showLabels && series.length === 1 && (
              <LabelList
                dataKey={s.key}
                position="top"
                fontSize={11}
                fill="var(--color-foreground)"
                formatter={(v: number) => v.toLocaleString('pt-BR')}
              />
            )}
          </Bar>
        ))}
      </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ---------- Gráfico de Barras (horizontal) ---------- */
export function BarChartH({
  data,
  yKey,
  valueKey,
}: {
  data: any[]
  yKey: string
  valueKey: string
}) {
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 40, left: 8, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="4 4" />
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey={yKey} width={90} {...axisProps} />
        <Tooltip cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} content={<ChartTooltip />} />
        <Bar dataKey={valueKey} name="Valor" radius={[0, 6, 6, 0]} maxBarSize={32} {...animation}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES[i % SERIES.length]} />
          ))}
          <LabelList
            dataKey={valueKey}
            position="right"
            fontSize={11}
            fill="var(--color-foreground)"
            formatter={(v: number) => v.toLocaleString('pt-BR')}
          />
        </Bar>
      </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ---------- Gráfico de Rosca (donut) ---------- */
export function DonutChart({
  data,
  nameKey,
  valueKey,
}: {
  data: any[]
  nameKey: string
  valueKey: string
}) {
  const total = data.reduce((acc, d) => acc + d[valueKey], 0)
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius={64}
          outerRadius={104}
          paddingAngle={3}
          cornerRadius={6}
          stroke="var(--color-card)"
          strokeWidth={2}
          label={({ value }) => `${Math.round((value / total) * 100)}%`}
          labelLine={false}
          {...animation}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES[i % SERIES.length]} />
          ))}
        </Pie>
      </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ---------- Gráfico de Linhas (com área orgânica) ---------- */
export function LineAreaChart({
  data,
  xKey,
  series,
}: {
  data: any[]
  xKey: string
  series: { key: string; name: string }[]
}) {
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[i % SERIES.length]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={SERIES[i % SERIES.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={SERIES[i % SERIES.length]}
            strokeWidth={2.5}
            fill={`url(#grad-${s.key})`}
            dot={{ r: 3, strokeWidth: 0, fill: SERIES[i % SERIES.length] }}
            activeDot={{ r: 5 }}
            {...animation}
          />
        ))}
      </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ---------- Linha pura (sem área) ---------- */
export function SimpleLineChart({
  data,
  xKey,
  valueKey,
  name,
}: {
  data: any[]
  xKey: string
  valueKey: string
  name: string
}) {
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 24, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey={valueKey}
          name={name}
          stroke="var(--color-chart-1)"
          strokeWidth={2.5}
          dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-chart-1)' }}
          activeDot={{ r: 5 }}
          {...animation}
        >
          <LabelList
            dataKey={valueKey}
            position="top"
            fontSize={11}
            fill="var(--color-foreground)"
            formatter={(v: number) => v.toLocaleString('pt-BR')}
          />
        </Line>
      </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ---------- Funil (conversão por etapa) ---------- */
export function FunnelChartComp({
  data,
  nameKey,
  valueKey,
}: {
  data: any[]
  nameKey: string
  valueKey: string
}) {
  const chartData = data.map((d, i) => ({
    ...d,
    fill: SERIES[i % SERIES.length],
  }))
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
      <FunnelChart>
        <Tooltip content={<ChartTooltip />} />
        <Funnel
          dataKey={valueKey}
          nameKey={nameKey}
          data={chartData}
          isAnimationActive
          animationDuration={1100}
          animationEasing="ease-out"
          stroke="var(--color-card)"
        >
          <LabelList
            position="right"
            dataKey={nameKey}
            fontSize={12}
            fill="var(--color-foreground)"
            stroke="none"
          />
          <LabelList
            position="left"
            dataKey={valueKey}
            fontSize={11}
            fill="var(--color-muted-foreground)"
            stroke="none"
            formatter={(v: number) => v.toLocaleString('pt-BR')}
          />
        </Funnel>
      </FunnelChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ---------- Radial (medidor de metas) ---------- */
export function RadialGaugeChart({
  data,
  nameKey,
  valueKey,
}: {
  data: any[]
  nameKey: string
  valueKey: string
}) {
  const chartData = data.map((d, i) => ({
    ...d,
    fill: SERIES[i % SERIES.length],
  }))
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        data={chartData}
        innerRadius="28%"
        outerRadius="100%"
        startAngle={90}
        endAngle={-270}
        barSize={14}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar
          dataKey={valueKey}
          background={{ fill: 'var(--color-muted)' }}
          cornerRadius={8}
          isAnimationActive
          animationDuration={1100}
          animationEasing="ease-out"
        />
        <Legend
          iconType="circle"
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 12 }}
          formatter={(_value, _entry, index) => chartData[index]?.[nameKey] ?? ''}
        />
        <Tooltip content={<ChartTooltip />} />
      </RadialBarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ---------- Radar (desempenho multi-eixo) ---------- */
export function RadarChartComp({
  data,
  criterionKey,
  series,
}: {
  data: any[]
  criterionKey: string
  series: { key: string; name: string }[]
}) {
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis
          dataKey={criterionKey}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
        />
        <PolarRadiusAxis tick={false} axisLine={false} />
        {series.map((s, i) => (
          <Radar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stroke={SERIES[i % SERIES.length]}
            fill={SERIES[i % SERIES.length]}
            fillOpacity={0.25}
            strokeWidth={2}
            isAnimationActive
            animationDuration={1100}
            animationEasing="ease-out"
          />
        ))}
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Tooltip content={<ChartTooltip />} />
      </RadarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
