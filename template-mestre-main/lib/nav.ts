import type { IconName } from '@/lib/icon-set'

export type NavItem = {
  label: string
  href: string
  icon: IconName
  description?: string
}

export type NavSection = {
  /** Título da seção (ex.: "Menu principal"). Omita para itens sem cabeçalho. */
  title?: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Menu principal',
    items: [
      {
        label: 'Painel',
        href: '/',
        icon: 'dashboard',
        description: 'Componentes, cores, gráficos e telas de exemplo',
      },
      { label: 'Componentes', href: '/componentes', icon: 'components' },
      { label: 'Usuários', href: '/usuarios', icon: 'users' },
      { label: 'Relatórios', href: '/relatorios', icon: 'analytics' },
      { label: 'Arquivos', href: '/arquivos', icon: 'files' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { label: 'Ajustes', href: '/ajustes', icon: 'settings' },
      { label: 'Documentos', href: '/documentos', icon: 'document' },
      { label: 'Notificações', href: '/notificacoes', icon: 'notification' },
    ],
  },
]

/** Lista achatada de todos os itens (útil para estado ativo e buscas). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items)
