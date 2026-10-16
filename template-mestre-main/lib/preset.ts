import { DEFAULT_DENSITY, DENSITY_PRESETS, type DensityId } from '@/lib/density'
import {
  DEFAULT_ICON_SET,
  ICON_SET_OPTIONS,
  type IconSetId,
} from '@/lib/icon-set'
import { DEFAULT_PALETTE, PALETTES, type PaletteId } from '@/lib/palettes'
import { DEFAULT_RADIUS, RADIUS_MAX, RADIUS_MIN } from '@/lib/radius'
import { DEFAULT_SHADOW, SHADOW_PRESETS, type ShadowId } from '@/lib/shadows'
import {
  DEFAULT_BACKGROUND_TONE,
  DEFAULT_SIDEBAR_COLOR,
  isBackgroundToneId,
  isSidebarColorId,
  type BackgroundToneId,
  type SidebarColorId,
} from '@/lib/shell-colors'
import {
  DEFAULT_SIDEBAR,
  DEFAULT_SIDEBAR_MENU_EFFECT,
  DEFAULT_SIDEBAR_MODE,
  DEFAULT_SIDEBAR_STYLE,
  SIDEBAR_MENU_EFFECT_OPTIONS,
  SIDEBAR_MODE_OPTIONS,
  SIDEBAR_OPTIONS,
  SIDEBAR_STYLE_OPTIONS,
  type SidebarMenuEffect,
  type SidebarMode,
  type SidebarStyle,
  type SidebarVisibility,
} from '@/lib/sidebar'
import { DEFAULT_ZOOM, ZOOM_OPTIONS, type ZoomId } from '@/lib/zoom'

/**
 * Versão do schema do preset. Incremente quando mudar a estrutura para
 * permitir migrações ao ler presets antigos salvos no banco de dados.
 */
export const PRESET_VERSION = 3

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Objeto serializável que descreve TODA a aparência do sistema.
 * É exatamente o que deve ser salvo/lido na coluna `preset` (jsonb) do banco.
 */
export type AppPreset = {
  version: number
  theme: ThemeMode
  palette: PaletteId
  radius: number
  shadow: ShadowId
  density: DensityId
  zoom: ZoomId
  sidebar: SidebarVisibility
  sidebarStyle: SidebarStyle
  sidebarMode: SidebarMode
  sidebarMenuEffect: SidebarMenuEffect
  sidebarColor: SidebarColorId
  backgroundTone: BackgroundToneId
  iconSet: IconSetId
}

export const DEFAULT_PRESET: AppPreset = {
  version: PRESET_VERSION,
  theme: 'system',
  palette: DEFAULT_PALETTE,
  radius: DEFAULT_RADIUS,
  shadow: DEFAULT_SHADOW,
  density: DEFAULT_DENSITY,
  zoom: DEFAULT_ZOOM,
  sidebar: DEFAULT_SIDEBAR,
  sidebarStyle: DEFAULT_SIDEBAR_STYLE,
  sidebarMode: DEFAULT_SIDEBAR_MODE,
  sidebarMenuEffect: DEFAULT_SIDEBAR_MENU_EFFECT,
  sidebarColor: DEFAULT_SIDEBAR_COLOR,
  backgroundTone: DEFAULT_BACKGROUND_TONE,
  iconSet: DEFAULT_ICON_SET,
}

const THEME_VALUES: ThemeMode[] = ['light', 'dark', 'system']

/** Transforma um preset em JSON formatado, pronto para exibir ou persistir. */
export function serializePreset(preset: AppPreset): string {
  return JSON.stringify(preset, null, 2)
}

type ParseResult =
  | { ok: true; preset: AppPreset }
  | { ok: false; error: string }

/**
 * Faz o parse e valida um preset vindo de qualquer fonte (textarea de
 * importação, banco de dados, API). Campos ausentes ou inválidos caem
 * silenciosamente no valor padrão — o resultado é sempre seguro de aplicar.
 */
export function parsePreset(input: string | unknown): ParseResult {
  let raw: unknown = input
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input)
    } catch {
      return { ok: false, error: 'JSON inválido. Verifique a formatação.' }
    }
  }

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'O preset deve ser um objeto JSON.' }
  }

  const obj = raw as Record<string, unknown>

  const palette = PALETTES.some((p) => p.id === obj.palette)
    ? (obj.palette as PaletteId)
    : DEFAULT_PRESET.palette

  const shadow = SHADOW_PRESETS.some((s) => s.id === obj.shadow)
    ? (obj.shadow as ShadowId)
    : DEFAULT_PRESET.shadow

  const zoom = ZOOM_OPTIONS.some((z) => z.id === obj.zoom)
    ? (obj.zoom as ZoomId)
    : DEFAULT_PRESET.zoom

  const density = DENSITY_PRESETS.some((d) => d.id === obj.density)
    ? (obj.density as DensityId)
    : DEFAULT_PRESET.density

  const sidebar = SIDEBAR_OPTIONS.some((s) => s.id === obj.sidebar)
    ? (obj.sidebar as SidebarVisibility)
    : DEFAULT_PRESET.sidebar

  const sidebarStyle = SIDEBAR_STYLE_OPTIONS.some(
    (s) => s.id === obj.sidebarStyle,
  )
    ? (obj.sidebarStyle as SidebarStyle)
    : DEFAULT_PRESET.sidebarStyle

  const sidebarMode = SIDEBAR_MODE_OPTIONS.some((s) => s.id === obj.sidebarMode)
    ? (obj.sidebarMode as SidebarMode)
    : DEFAULT_PRESET.sidebarMode

  const sidebarMenuEffect = SIDEBAR_MENU_EFFECT_OPTIONS.some(
    (s) => s.id === obj.sidebarMenuEffect,
  )
    ? (obj.sidebarMenuEffect as SidebarMenuEffect)
    : DEFAULT_PRESET.sidebarMenuEffect

  const sidebarColor = isSidebarColorId(obj.sidebarColor)
    ? obj.sidebarColor
    : DEFAULT_PRESET.sidebarColor

  const backgroundTone = isBackgroundToneId(obj.backgroundTone)
    ? obj.backgroundTone
    : DEFAULT_PRESET.backgroundTone

  const iconSet = ICON_SET_OPTIONS.some((i) => i.id === obj.iconSet)
    ? (obj.iconSet as IconSetId)
    : DEFAULT_PRESET.iconSet

  const theme = THEME_VALUES.includes(obj.theme as ThemeMode)
    ? (obj.theme as ThemeMode)
    : DEFAULT_PRESET.theme

  let radius = Number(obj.radius)
  if (Number.isNaN(radius)) radius = DEFAULT_PRESET.radius
  radius = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, radius))

  const version =
    typeof obj.version === 'number' ? obj.version : PRESET_VERSION

  return {
    ok: true,
    preset: {
      version,
      theme,
      palette,
      radius,
      shadow,
      density,
      zoom,
      sidebar,
      sidebarStyle,
      sidebarMode,
      sidebarMenuEffect,
      sidebarColor,
      backgroundTone,
      iconSet,
    },
  }
}
