export type IconSetId = 'lucide' | 'hugeicons'

export type IconSetOption = {
  id: IconSetId
  label: string
  description: string
}

export const ICON_SET_OPTIONS: IconSetOption[] = [
  {
    id: 'lucide',
    label: 'Lucide',
    description: 'Ícones de traço fino e geométrico (padrão).',
  },
  {
    id: 'hugeicons',
    label: 'Hugeicons',
    description: 'Conjunto alternativo, com traços mais suaves.',
  },
]

export const DEFAULT_ICON_SET: IconSetId = 'lucide'

/** Nomes semânticos usados em todo o app — independentes da biblioteca. */
export type IconName =
  | 'dashboard'
  | 'components'
  | 'users'
  | 'analytics'
  | 'files'
  | 'settings'
  | 'document'
  | 'notification'
  | 'logo'
  | 'profile'
  | 'profileSettings'
  | 'logout'
  | 'menu'
  | 'close'
  | 'collapse'
  | 'expand'
