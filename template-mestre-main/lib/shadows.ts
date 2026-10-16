export type ShadowId = 'none' | 'subtle' | 'default' | 'medium' | 'strong'

export type ShadowPreset = {
  id: ShadowId
  name: string
  description: string
  /** valores aplicados às variáveis --shadow-sm / --shadow-md / --shadow-lg / --shadow-xl */
  sm: string
  md: string
  lg: string
  xl: string
}

export const DEFAULT_SHADOW: ShadowId = 'default'

const c = '220 40% 12%' // cor base da sombra (HSL aproximada do foreground)

export const SHADOW_PRESETS: ShadowPreset[] = [
  {
    id: 'none',
    name: 'Nenhuma',
    description: 'Sem sombras, interface plana',
    sm: 'none',
    md: 'none',
    lg: 'none',
    xl: 'none',
  },
  {
    id: 'subtle',
    name: 'Sutil',
    description: 'Sombras quase imperceptíveis',
    sm: `0 1px 2px 0 hsl(${c} / 0.04)`,
    md: `0 2px 4px -1px hsl(${c} / 0.05), 0 1px 2px -1px hsl(${c} / 0.04)`,
    lg: `0 6px 12px -4px hsl(${c} / 0.06), 0 2px 4px -2px hsl(${c} / 0.05)`,
    xl: `0 12px 24px -8px hsl(${c} / 0.08), 0 4px 8px -4px hsl(${c} / 0.05)`,
  },
  {
    id: 'default',
    name: 'Padrão',
    description: 'Profundidade equilibrada (recomendado)',
    sm: `0 1px 3px 0 hsl(${c} / 0.08), 0 1px 2px -1px hsl(${c} / 0.06)`,
    md: `0 4px 8px -2px hsl(${c} / 0.1), 0 2px 4px -2px hsl(${c} / 0.06)`,
    lg: `0 12px 20px -6px hsl(${c} / 0.12), 0 4px 8px -4px hsl(${c} / 0.08)`,
    xl: `0 20px 32px -10px hsl(${c} / 0.16), 0 8px 16px -8px hsl(${c} / 0.1)`,
  },
  {
    id: 'medium',
    name: 'Médio',
    description: 'Mais elevação e contraste',
    sm: `0 2px 4px 0 hsl(${c} / 0.12), 0 1px 2px -1px hsl(${c} / 0.1)`,
    md: `0 6px 12px -2px hsl(${c} / 0.16), 0 2px 6px -2px hsl(${c} / 0.1)`,
    lg: `0 16px 28px -6px hsl(${c} / 0.2), 0 6px 12px -4px hsl(${c} / 0.12)`,
    xl: `0 28px 44px -12px hsl(${c} / 0.26), 0 10px 20px -8px hsl(${c} / 0.16)`,
  },
  {
    id: 'strong',
    name: 'Forte',
    description: 'Sombras intensas e dramáticas',
    sm: `0 2px 6px 0 hsl(${c} / 0.2), 0 1px 3px -1px hsl(${c} / 0.16)`,
    md: `0 8px 16px -2px hsl(${c} / 0.26), 0 3px 8px -2px hsl(${c} / 0.16)`,
    lg: `0 20px 36px -6px hsl(${c} / 0.32), 0 8px 16px -4px hsl(${c} / 0.2)`,
    xl: `0 36px 56px -12px hsl(${c} / 0.4), 0 14px 28px -8px hsl(${c} / 0.24)`,
  },
]

export function getShadowPreset(id: ShadowId): ShadowPreset {
  return SHADOW_PRESETS.find((p) => p.id === id) ?? SHADOW_PRESETS[2]
}
