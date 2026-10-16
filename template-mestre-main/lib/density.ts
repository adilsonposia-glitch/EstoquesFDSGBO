export type DensityId = 'compact' | 'default' | 'comfortable' | 'spacious'

export type DensityPreset = {
  id: DensityId
  name: string
  description: string
  /** Multiplicador aplicado ao padding base de todos os elementos. */
  scale: number
}

export const DEFAULT_DENSITY: DensityId = 'default'

export const DENSITY_PRESETS: DensityPreset[] = [
  {
    id: 'compact',
    name: 'Compacto',
    description: 'Elementos enxutos, ideal para telas densas',
    scale: 0.75,
  },
  {
    id: 'default',
    name: 'Padrão',
    description: 'Espaçamento equilibrado (recomendado)',
    scale: 1,
  },
  {
    id: 'comfortable',
    name: 'Confortável',
    description: 'Mais respiro interno nos elementos',
    scale: 1.25,
  },
  {
    id: 'spacious',
    name: 'Amplo',
    description: 'Elementos altos e generosos',
    scale: 1.5,
  },
]

export function getDensityPreset(id: DensityId): DensityPreset {
  return (
    DENSITY_PRESETS.find((p) => p.id === id) ??
    DENSITY_PRESETS.find((p) => p.id === DEFAULT_DENSITY)!
  )
}
