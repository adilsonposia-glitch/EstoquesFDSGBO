export type SidebarVisibility = 'visible' | 'hidden'

export type SidebarOption = {
  id: SidebarVisibility
  label: string
  description: string
}

export const SIDEBAR_OPTIONS: SidebarOption[] = [
  {
    id: 'visible',
    label: 'Visível',
    description: 'Barra lateral fixa sempre à vista.',
  },
  {
    id: 'hidden',
    label: 'Oculta (menu sanduíche)',
    description: 'Abre por cima ao clicar no menu.',
  },
]

export const DEFAULT_SIDEBAR: SidebarVisibility = 'visible'

export type SidebarStyle = 'flat' | 'floating'

export type SidebarStyleOption = {
  id: SidebarStyle
  label: string
  description: string
}

export const SIDEBAR_STYLE_OPTIONS: SidebarStyleOption[] = [
  {
    id: 'flat',
    label: 'Plana',
    description: 'Encostada na borda, ocupando toda a altura.',
  },
  {
    id: 'floating',
    label: 'Flutuante',
    description: 'Cartão destacado com margem, borda e sombra.',
  },
]

export const DEFAULT_SIDEBAR_STYLE: SidebarStyle = 'flat'

/**
 * Densidade da barra flutuante. Só tem efeito quando o estilo é "floating".
 * - full: ícones + rótulos sempre visíveis.
 * - compact: trilho fino só com ícones; o nome aparece ao passar o mouse,
 *   expandindo apenas o item sob o cursor (efeito hover/over).
 */
export type SidebarMode = 'full' | 'compact'

export type SidebarModeOption = {
  id: SidebarMode
  label: string
  description: string
}

export const SIDEBAR_MODE_OPTIONS: SidebarModeOption[] = [
  {
    id: 'full',
    label: 'Completo',
    description: 'Ícones e rótulos sempre visíveis.',
  },
  {
    id: 'compact',
    label: 'Compacto',
    description: 'Só ícones; o nome aparece ao passar o mouse.',
  },
]

export const DEFAULT_SIDEBAR_MODE: SidebarMode = 'full'

/**
 * Animação da pílula de rótulo no menu recolhido (compacto ou colapsado).
 */
export type SidebarMenuEffect = 'fade' | 'slide'

export type SidebarMenuEffectOption = {
  id: SidebarMenuEffect
  label: string
  description: string
}

export const SIDEBAR_MENU_EFFECT_OPTIONS: SidebarMenuEffectOption[] = [
  {
    id: 'slide',
    label: 'Slide',
    description: 'A pílula expande organicamente para a direita.',
  },
  {
    id: 'fade',
    label: 'Fade',
    description: 'A pílula aparece com fade, sem deslocamento.',
  },
]

export const DEFAULT_SIDEBAR_MENU_EFFECT: SidebarMenuEffect = 'slide'
