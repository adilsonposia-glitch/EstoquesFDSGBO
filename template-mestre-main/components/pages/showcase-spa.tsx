'use client'

import { BarChart3, Component, Palette, Users } from '@/components/ui/icons'
import { ComponentesView } from '@/components/pages/componentes-view'
import { CoresView } from '@/components/pages/cores-view'
import { CrudView } from '@/components/pages/crud-view'
import { GraficosView } from '@/components/pages/graficos-view'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { Tabs, TabsContent, TabsList, TabsPanel, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { value: 'componentes', label: 'Componentes', icon: Component },
  { value: 'cores', label: 'Cores', icon: Palette },
  { value: 'graficos', label: 'Gráficos', icon: BarChart3 },
  { value: 'crud', label: 'CRUD', icon: Users },
] as const

export function ShowcaseSpa() {
  const { visibility } = useSidebar()
  // Sidebar oculta → conteúdo aproveita mais a largura disponível.
  const containerWidth =
    visibility === 'hidden' ? 'max-w-screen-2xl' : 'max-w-6xl'

  return (
    <Tabs defaultValue="componentes" className="min-w-0 gap-0">
      <div className="sticky top-16 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div
          className={cn(
            'mx-auto w-full min-w-0 px-4 py-2 sm:px-6 lg:px-8',
            containerWidth,
          )}
        >
          <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1">
            <TabsList className="w-max">
              {SECTIONS.map((s) => {
                const Icon = s.icon
                return (
                  <TabsTrigger key={s.value} value={s.value}>
                    <Icon className="size-4 shrink-0" />
                    {s.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mx-auto w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8',
          containerWidth,
        )}
      >
        <TabsPanel>
          <TabsContent value="componentes">
            <ComponentesView />
          </TabsContent>
          <TabsContent value="cores">
            <CoresView />
          </TabsContent>
          <TabsContent value="graficos">
            <GraficosView />
          </TabsContent>
          <TabsContent value="crud">
            <CrudView />
          </TabsContent>
        </TabsPanel>
      </div>
    </Tabs>
  )
}
