export type RadiusPreset = {
  id: string
  name: string
  /** valor em rem aplicado em --radius */
  value: number
}

export const DEFAULT_RADIUS = 0.85

export const RADIUS_MIN = 0
export const RADIUS_MAX = 2

export const RADIUS_PRESETS: RadiusPreset[] = [
  { id: 'none', name: 'Reto', value: 0 },
  { id: 'sm', name: 'Sutil', value: 0.35 },
  { id: 'md', name: 'Padrão', value: 0.85 },
  { id: 'lg', name: 'Suave', value: 1.25 },
  { id: 'full', name: 'Arredondado', value: 1.75 },
]
