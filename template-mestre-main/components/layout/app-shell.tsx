'use client'

import { Settings2 } from '@/components/ui/icons'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ComponentesView } from '@/components/pages/componentes-view'
import { CrudView } from '@/components/pages/crud-view'
import { GraficosView } from '@/components/pages/graficos-view'
import { PresetPanel } from '@/components/pages/preset-panel'
import { PageHeader } from '@/components/showcase'
import { PaletteSwitcher } from '@/components/palette-switcher'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { PageTransition } from '@/components/ui/page-transition'
import { useToast } from '@/components/ui/toast'
import { useClickOutside } from '@/hooks/use-click-outside'
import { NAV_ITEMS, NAV_SECTIONS, type NavItem } from '@/lib/nav'
import type { IconName } from '@/lib/icon-set'
import type { SidebarMenuEffect } from '@/lib/sidebar'
import { isSolidSidebarColor } from '@/lib/shell-colors'
import { cn } from '@/lib/utils'

const FLOAT_INSET = 12
// Margem (lateral/vertical) da barra flutuante no modo compacto — um pouco
// maior, para deixar mais respiro em cima, embaixo e à esquerda.
const COMPACT_INSET = 16

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)
  // Rota ativa da SPA (menu lateral).
  const [active, setActive] = useState(NAV_ITEMS[0]?.href ?? '/')
  const { visibility, style, mode } = useSidebar()
  // "visible" = barra fixa no desktop; "hidden" = sempre atrás do menu sanduíche.
  const sidebarFixed = visibility === 'visible'
  const floating = style === 'floating'
  // Compacto só existe no estilo flutuante: trilho fino só com ícones.
  const compact = floating && mode === 'compact'

  // Detecta o breakpoint lg (>=1024px) para compensar a margem da sidebar fixa.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  // No modo compacto a barra é um trilho estreito com margem lateral um
  // pouco maior; nos demais, mantém a largura padrão.
  const sidebarWidth = compact ? 72 : collapsed ? 76 : 264
  const leftGutter = compact ? COMPACT_INSET : FLOAT_INSET
  const contentMargin =
    isDesktop && sidebarFixed
      ? sidebarWidth + (floating ? leftGutter * 2 : 0)
      : 0

  return (
    <div className="min-h-svh bg-background">
      {/* Sidebar desktop (fixa) — só no modo "visível" */}
      {sidebarFixed && (
        <motion.aside
          animate={{ width: sidebarWidth }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className={cn(
            'fixed left-0 z-40 hidden flex-col bg-sidebar lg:flex',
            floating
              ? compact
                ? // ~70% da altura, centralizado vertical, com respiro em cima
                  // e embaixo. Sem overflow-hidden: os itens expandem para fora.
                  'left-4 top-1/2 h-[70svh] -translate-y-1/2 rounded-2xl border border-sidebar-border shadow-lg'
                : cn(
                    'inset-y-3 left-3 rounded-2xl border border-sidebar-border shadow-lg',
                    !collapsed && 'overflow-hidden',
                  )
              : cn(
                  'inset-y-0 h-svh',
                  collapsed && 'overflow-visible',
                ),
          )}
        >
          <SidebarContent
            collapsed={collapsed}
            floating={floating}
            compact={compact}
            active={active}
            onNavigate={setActive}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </motion.aside>
      )}

      {/* Drawer (mobile + modo oculto no desktop) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm',
                sidebarFixed && 'lg:hidden',
              )}
            />
            <motion.aside
              initial={{ x: '-110%' }}
              animate={{ x: 0 }}
              exit={{ x: '-110%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
              className={cn(
                'fixed left-0 z-50 flex w-72 flex-col bg-sidebar',
                floating
                  ? 'inset-y-3 left-3 overflow-hidden rounded-2xl border border-sidebar-border shadow-xl'
                  : 'inset-y-0',
                sidebarFixed && 'lg:hidden',
              )}
            >
              <SidebarContent
                collapsed={false}
                floating={floating}
                compact={false}
                active={active}
                onNavigate={(href) => {
                  setActive(href)
                  setMobileOpen(false)
                }}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <motion.div
        animate={{ marginLeft: contentMargin }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="flex min-h-svh min-w-0 flex-col"
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className={cn(
              'grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              sidebarFixed && 'lg:hidden',
            )}
          >
            <Icon name="menu" className="size-5" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <PaletteSwitcher variant="dots" className="hidden sm:flex" />
            <ThemeToggle />
            <Button
              variant="outline"
              size="default"
              onClick={() => setPresetOpen(true)}
            >
              <Settings2 className="size-4" />
              <span className="hidden sm:inline">Preset</span>
            </Button>
          </div>
        </header>

        {/* overflow-x-clip (não hidden): evita scrollport que quebra position:sticky das tabs */}
        <main className="flex-1 overflow-x-clip">
          <PageTransition pageKey={active}>
            {resolveNavScreen(active, children)}
          </PageTransition>
        </main>
      </motion.div>

      <PresetPanel open={presetOpen} onClose={() => setPresetOpen(false)} />
    </div>
  )
}

function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  )
}

function resolveNavScreen(href: string, children: ReactNode) {
  switch (href) {
    case '/':
      return children
    case '/componentes':
      return (
        <PageContainer>
          <ComponentesView />
        </PageContainer>
      )
    case '/usuarios':
      return (
        <PageContainer>
          <CrudView />
        </PageContainer>
      )
    case '/relatorios':
      return (
        <PageContainer>
          <GraficosView />
        </PageContainer>
      )
    default: {
      const item = NAV_ITEMS.find((navItem) => navItem.href === href)
      return <NavPlaceholderView item={item} />
    }
  }
}

function NavPlaceholderView({ item }: { item?: NavItem }) {
  return (
    <PageContainer>
      <PageHeader
        title={item?.label ?? 'Em breve'}
        description={
          item?.description ??
          'Esta tela faz parte do template de navegação. Personalize conforme o seu produto.'
        }
      />
    </PageContainer>
  )
}

function SidebarContent({
  collapsed,
  floating,
  compact = false,
  active,
  onNavigate,
  onToggleCollapse,
  onClose,
}: {
  collapsed: boolean
  floating: boolean
  compact?: boolean
  active: string
  onNavigate: (href: string) => void
  onToggleCollapse?: () => void
  onClose?: () => void
}) {
  const { menuEffect, sidebarColor } = useSidebar()
  const solidSidebar = isSolidSidebarColor(sidebarColor)

  if (compact) {
    return (
      <CompactSidebarContent
        active={active}
        onNavigate={onNavigate}
        menuEffect={menuEffect}
      />
    )
  }

  return (
    <div className={cn('flex h-full flex-col', collapsed && 'overflow-visible')}>
      {/* Traffic lights — só no estilo flutuante (igual ao mock) */}
      {floating && !collapsed && (
        <div className="flex items-center gap-1.5 px-4 pt-4" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
      )}

      {/* Marca */}
      <div
        className={cn(
          'flex',
          collapsed
            ? 'flex-col items-center gap-2 py-3'
            : 'h-16 items-center gap-3 px-4',
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Icon name="logo" className="size-5" />
        </span>
        {!collapsed && (
          <span className="font-heading text-base font-semibold tracking-tight text-sidebar-foreground">
            Nova UI
          </span>
        )}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="ml-auto grid size-8 place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Icon name="close" className="size-4" />
          </button>
        ) : (
          onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className={cn(
                'grid size-8 place-items-center rounded-lg transition-colors',
                solidSidebar
                  ? 'text-sidebar-foreground/75 hover:bg-white/10 hover:text-sidebar-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                collapsed ? 'size-9' : 'ml-auto',
              )}
            >
              <Icon
                name={collapsed ? 'expand' : 'collapse'}
                className="size-4"
              />
            </button>
          )
        )}
      </div>

      {/* Navegação */}
      <nav
        className={cn(
          'flex flex-1 flex-col gap-1 p-3',
          collapsed
            ? 'items-center overflow-visible'
            : 'overflow-y-auto',
        )}
      >
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.title ?? sectionIndex}
            className={cn(
              'flex w-full flex-col gap-1',
              collapsed && 'items-center',
              sectionIndex > 0 && (collapsed ? 'mt-3' : 'mt-4'),
            )}
          >
            {section.title &&
              (collapsed ? (
                sectionIndex > 0 && (
                  <div className="my-1 h-px w-6 bg-sidebar-border" />
                )
              ) : (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/55">
                  {section.title}
                </p>
              ))}
            {section.items.map((item) => {
              const isActive = active === item.href
              if (collapsed) {
                return (
                  <CollapsedNavButton
                    key={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive}
                    menuEffect={menuEffect}
                    solidSidebar={solidSidebar}
                    onClick={() => onNavigate(item.href)}
                  />
                )
              }
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => onNavigate(item.href)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? solidSidebar
                        ? 'bg-white/15 text-sidebar-foreground'
                        : 'bg-primary/10 text-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )}
                >
                  <Icon
                    name={item.icon}
                    className="size-5 shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-12"
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Perfil */}
      <ProfileFooter collapsed={collapsed} floating={floating} />
    </div>
  )
}

/**
 * Trilho compacto: só ícones. Ao passar o mouse, o item sob o cursor
 * expande para a direita (sobre o conteúdo) revelando o rótulo, com efeito
 * de "over". Como cada item reage ao próprio hover, ao mover o mouse entre
 * eles o anterior se retrai e o atual se expande naturalmente.
 */
function CompactSidebarContent({
  active,
  onNavigate,
  menuEffect,
}: {
  active: string
  onNavigate: (href: string) => void
  menuEffect: SidebarMenuEffect
}) {
  const { sidebarColor } = useSidebar()
  const solidSidebar = isSolidSidebarColor(sidebarColor)

  return (
    <div className="flex h-full flex-col">
      {/* Marca — só o logo, centralizado */}
      <div className="flex items-center justify-center py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Icon name="logo" className="size-5" />
        </span>
      </div>

      {/* Navegação (overflow visível para os itens expandirem para fora) */}
      <nav className="flex flex-1 flex-col gap-1 overflow-visible px-3 py-2">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.title ?? sectionIndex}
            className="flex w-full flex-col gap-1"
          >
            {section.title && sectionIndex > 0 && (
              <div className="my-1 ml-2 h-px w-6 bg-sidebar-border" />
            )}
            {section.items.map((item) => {
              const isActive = active === item.href
              return (
                <CollapsedNavButton
                  key={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isActive}
                  menuEffect={menuEffect}
                  solidSidebar={solidSidebar}
                  onClick={() => onNavigate(item.href)}
                />
              )
            })}
          </div>
        ))}
      </nav>

      {/* Perfil — avatar somente (layout recolhido) */}
      <ProfileFooter collapsed floating />
    </div>
  )
}

function ProfileFooter({
  collapsed,
  floating,
}: {
  collapsed: boolean
  floating: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { sidebarColor } = useSidebar()
  const solidSidebar = isSolidSidebarColor(sidebarColor)
  useClickOutside(ref, () => setOpen(false), open)

  const menuItems = [
    { label: 'Meu perfil', icon: 'profile' as const },
    { label: 'Configurações da conta', icon: 'profileSettings' as const },
  ]

  const handleAction = (label: string) => {
    setOpen(false)
    toast({ title: label, description: 'Ação de exemplo do template.' })
  }

  return (
    <div
      className={cn(
        'relative p-3',
        collapsed && 'overflow-visible',
      )}
      ref={ref}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="menu"
            className={cn(
              'absolute bottom-full z-50 mb-2 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-app-md',
              collapsed ? 'left-3 w-56' : 'inset-x-3',
            )}
          >
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => handleAction(item.label)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon
                  name={item.icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction('Sair')}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Icon name="logout" className="size-4 shrink-0" />
              <span className="truncate">Sair</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn('flex items-center gap-1', collapsed && 'justify-center')}>
        {collapsed ? (
          <div className="group/profile relative w-10 shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="Abrir menu de perfil"
              className={cn(
                'flex size-10 items-center justify-center rounded-xl transition-colors',
                solidSidebar
                  ? 'hover:bg-white/10'
                  : 'hover:bg-sidebar-accent',
              )}
            >
              <Image
                src="/avatar.png"
                alt="Foto de perfil de Ana Martins"
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            </button>
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-1/2 left-full z-50 ml-3 flex h-10 -translate-y-1/2 items-center gap-2.5 rounded-xl py-0 pr-4 pl-1.5 whitespace-nowrap',
                solidSidebar
                  ? 'bg-sidebar text-sidebar-foreground shadow-xl ring-1 ring-white/10'
                  : 'border border-sidebar-border bg-sidebar shadow-lg',
                'scale-95 opacity-0 transition-all duration-200 ease-out',
                'group-hover/profile:scale-100 group-hover/profile:opacity-100',
              )}
            >
              <Image
                src="/avatar.png"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full object-cover"
              />
              <span className="text-left leading-tight">
                <span className="block text-sm font-medium text-sidebar-foreground">
                  Ana Martins
                </span>
                <span className="block text-xs text-sidebar-foreground/55">
                  Administradora
                </span>
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Abrir menu de perfil"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent"
          >
            <Image
              src="/avatar.png"
              alt="Foto de perfil de Ana Martins"
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                Ana Martins
              </p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                Administradora
              </p>
            </div>
          </button>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={() => handleAction('Sair')}
            aria-label="Sair"
            title="Sair"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Icon name="logout" className="size-[18px]" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Item de navegação recolhido: ao passar o mouse, exibe uma pílula
 * posicionada à direita (fora do trilho), sem sobrepor os demais ícones.
 */
function collapsedHoverPill(solidSidebar: boolean) {
  return solidSidebar
    ? 'bg-sidebar text-sidebar-foreground shadow-xl ring-1 ring-white/10'
    : 'border border-sidebar-border bg-sidebar shadow-lg'
}

function CollapsedNavButton({
  label,
  icon,
  isActive,
  menuEffect,
  solidSidebar = false,
  onClick,
}: {
  label: string
  icon: IconName
  isActive: boolean
  menuEffect: SidebarMenuEffect
  solidSidebar?: boolean
  onClick: () => void
}) {
  const iconTone = cn(
    solidSidebar
      ? cn(
          isActive
            ? 'bg-white/12 text-sidebar-foreground'
            : 'text-sidebar-foreground/75 hover:bg-white/10 hover:text-sidebar-foreground',
        )
      : cn(
          isActive
            ? 'bg-primary-soft text-primary'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        ),
  )

  const iconEl = (
    <Icon
      name={icon}
      className="size-5 shrink-0 transition-transform duration-200 ease-out group-hover/nav:-rotate-12"
    />
  )

  if (menuEffect === 'slide') {
    return (
      <div className="group/nav relative w-10 shrink-0 hover:z-50">
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn(
            'relative flex h-10 w-10 items-center overflow-hidden rounded-xl border border-transparent transition-[width,box-shadow,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            solidSidebar
              ? cn(
                  isActive
                    ? 'bg-white/12 text-sidebar-foreground'
                    : 'text-sidebar-foreground/75',
                  'group-hover/nav:w-52 group-hover/nav:bg-sidebar group-hover/nav:text-sidebar-foreground group-hover/nav:shadow-xl group-hover/nav:ring-1 group-hover/nav:ring-white/10',
                )
              : cn(
                  iconTone,
                  'group-hover/nav:w-56 group-hover/nav:border-sidebar-border group-hover/nav:bg-sidebar group-hover/nav:shadow-lg',
                ),
          )}
        >
          <span className="grid size-10 shrink-0 place-items-center">{iconEl}</span>
          <span className="whitespace-nowrap pr-4 text-sm font-medium">{label}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="group/nav relative w-10 shrink-0 hover:z-50">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          'flex size-10 items-center justify-center rounded-xl transition-colors duration-200',
          iconTone,
        )}
      >
        {iconEl}
      </button>

      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 left-full z-50 ml-3 flex h-10 -translate-y-1/2 items-center gap-2.5 rounded-xl py-0 pr-4 pl-3 whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover/nav:opacity-100',
          collapsedHoverPill(solidSidebar),
        )}
      >
        <Icon name={icon} className="size-4 shrink-0" />
        <span className="text-sm font-medium text-sidebar-foreground">{label}</span>
      </div>
    </div>
  )
}
