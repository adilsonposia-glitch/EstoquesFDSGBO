/** Root onde o zoom do app é aplicado (overlays flutuantes usam o mesmo). */
export const APP_ZOOM_ROOT_ID = 'app-zoom-root'

export type ZoomId = 'compact' | 'default' | 'comfortable' | 'auto'

export type ZoomOption = {
  id: ZoomId
  label: string
  description: string
  /** fator de zoom; null = calculado automaticamente */
  value: number | null
}

export const ZOOM_OPTIONS: ZoomOption[] = [
  {
    id: 'compact',
    label: 'Compacto (90%)',
    description: 'Mais conteúdo na tela',
    value: 0.9,
  },
  {
    id: 'default',
    label: 'Padrão (100%)',
    description: 'Tamanho recomendado',
    value: 1,
  },
  {
    id: 'comfortable',
    label: 'Amplo (115%)',
    description: 'Elementos maiores',
    value: 1.15,
  },
  {
    id: 'auto',
    label: 'Automático',
    description: 'Ajusta conforme a largura da tela',
    value: null,
  },
]

export const DEFAULT_ZOOM: ZoomId = 'default'

/** Calcula o fator de zoom automático com base na largura da janela. */
export function computeAutoZoom(width: number): number {
  if (width < 768) return 0.9
  if (width < 1280) return 1
  if (width < 1920) return 1.1
  return 1.2
}

export function resolveZoom(id: ZoomId, width: number): number {
  const option = ZOOM_OPTIONS.find((o) => o.id === id)
  if (!option || option.value === null) return computeAutoZoom(width)
  return option.value
}
