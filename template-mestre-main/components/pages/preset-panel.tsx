'use client'

import {
  Check,
  LayoutGrid,
  Menu,
  PanelLeft,
  RotateCcw,
  Settings2,
  Sun,
  X,
} from '@/components/ui/icons'
import { GridViewIcon } from 'hugeicons-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { PresetJsonCard } from '@/components/pages/preset-json-card'
import { useDensity } from '@/components/providers/density-provider'
import { useIconSet } from '@/components/providers/icon-set-provider'
import { useRadius } from '@/components/providers/radius-provider'
import { useShadow } from '@/components/providers/shadow-provider'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { useZoom } from '@/components/providers/zoom-provider'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { DENSITY_PRESETS } from '@/lib/density'
import { ICON_SET_OPTIONS } from '@/lib/icon-set'
import {
  DEFAULT_RADIUS,
  RADIUS_MAX,
  RADIUS_MIN,
  RADIUS_PRESETS,
} from '@/lib/radius'
import { getShadowPreset, SHADOW_PRESETS } from '@/lib/shadows'
import {
  SIDEBAR_MENU_EFFECT_OPTIONS,
  SIDEBAR_MODE_OPTIONS,
  SIDEBAR_OPTIONS,
  SIDEBAR_STYLE_OPTIONS,
} from '@/lib/sidebar'
import {
  BACKGROUND_TONE_OPTIONS,
  DEFAULT_BACKGROUND_TONE,
  DEFAULT_SIDEBAR_COLOR,
  SIDEBAR_COLOR_OPTIONS,
} from '@/lib/shell-colors'
import { ZOOM_OPTIONS } from '@/lib/zoom'

const ZOOM_COMBO_OPTIONS = ZOOM_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
  description: o.description,
}))

export function PresetPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  // fecha com Esc e trava o scroll do body enquanto aberto
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-foreground/5"
            aria-hidden
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            role="dialog"
            aria-label="Configurações de preset"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-xl"
          >
            <header className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Settings2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-base font-semibold tracking-tight">
                  Preset do sistema
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  Bordas, sombras, densidade, zoom e tema
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Fechar painel de preset"
              >
                <X />
              </Button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-7">
                {/* Arredondamento de borda */}
                <PresetSection
                  title="Arredondamento de borda"
                  description="Valor global do raio (--radius)."
                >
                  <RadiusControl />
                </PresetSection>

                {/* Sombra */}
                <PresetSection
                  title="Sombra dos elementos"
                  description="Elevação de cards, dropdowns e popovers."
                >
                  <ShadowControl />
                </PresetSection>

                {/* Densidade */}
                <PresetSection
                  title="Densidade dos elementos"
                  description="Padding de inputs, dropdowns, badges, botões e cards."
                >
                  <DensityControl />
                </PresetSection>

                {/* Zoom */}
                <PresetSection
                  title="Zoom do sistema"
                  description="Escala toda a interface."
                >
                  <ZoomControl />
                </PresetSection>

                {/* Barra lateral */}
                <PresetSection
                  title="Barra lateral"
                  description="Defina se o menu fica fixo ou oculto atrás de um menu sanduíche."
                >
                  <SidebarControl />
                </PresetSection>

                {/* Cor da barra lateral */}
                <PresetSection
                  title="Cor da barra lateral"
                  description="Neutro, branco ou uma cor sólida da paleta."
                >
                  <SidebarColorControl />
                </PresetSection>

                {/* Fundo da aplicação */}
                <PresetSection
                  title="Fundo da aplicação"
                  description="Branco ou neutro (#F9FAFB)."
                >
                  <BackgroundToneControl />
                </PresetSection>

                {/* Estilo da barra lateral */}
                <PresetSection
                  title="Estilo da barra lateral"
                  description="Plana (encostada na borda) ou flutuante (cartão destacado)."
                >
                  <SidebarStyleControl />
                </PresetSection>

                {/* Densidade da barra flutuante — só quando o estilo é flutuante */}
                <SidebarModeSection />

                {/* Efeito da pílula no menu recolhido */}
                <PresetSection
                  title="Efeito do menu recolhido"
                  description="Animação da pílula ao passar o mouse nos ícones (compacto ou colapsado)."
                >
                  <SidebarMenuEffectControl />
                </PresetSection>

                {/* Conjunto de ícones */}
                <PresetSection
                  title="Conjunto de ícones"
                  description="Troque a biblioteca de ícones usada em todo o sistema."
                >
                  <IconSetControl />
                </PresetSection>

                {/* JSON export/import/save */}
                <PresetJsonCard />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function PresetSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

// --- controles (cada um consome seu próprio provider) ---

function RadiusControl() {
  const { radius, setRadius } = useRadius()
  const activePreset = RADIUS_PRESETS.find(
    (p) => Math.abs(p.value - radius) < 0.001,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label>Raio</Label>
        <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
          {radius.toFixed(2)}rem
        </span>
      </div>
      <Slider
        aria-label="Arredondamento de borda"
        min={RADIUS_MIN}
        max={RADIUS_MAX}
        step={0.05}
        value={radius}
        onChange={setRadius}
      />
      <div className="grid grid-cols-2 gap-2">
        {RADIUS_PRESETS.map((preset) => {
          const isActive = activePreset?.id === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setRadius(preset.value)}
              className={`flex items-center justify-between gap-2 border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
              style={{ borderRadius: `${preset.value}rem` }}
            >
              <span className="font-medium">{preset.name}</span>
              {isActive && <Check className="size-4 shrink-0" />}
            </button>
          )
        })}
      </div>
      <Button
        variant="outline"
        onClick={() => setRadius(DEFAULT_RADIUS)}
        className="w-full"
      >
        <RotateCcw />
        Restaurar padrão
      </Button>
    </div>
  )
}

function ShadowControl() {
  const { shadow, setShadow } = useShadow()
  return (
    <div className="grid grid-cols-1 gap-2">
      {SHADOW_PRESETS.map((preset) => {
        const isActive = shadow === preset.id
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => setShadow(preset.id)}
            className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors ${
              isActive ? 'border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-card"
              style={{ boxShadow: getShadowPreset(preset.id).md }}
              aria-hidden
            >
              <span className="size-3 rounded-sm bg-muted-foreground/40" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {preset.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {preset.description}
              </span>
            </span>
            {isActive && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

function DensityControl() {
  const { density, setDensity } = useDensity()
  return (
    <div className="grid grid-cols-1 gap-2">
      {DENSITY_PRESETS.map((preset) => {
        const isActive = density === preset.id
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => setDensity(preset.id)}
            className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors ${
              isActive ? 'border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            <span
              className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-[3px] rounded-lg border border-border bg-card"
              aria-hidden
            >
              <span
                className="rounded-full bg-muted-foreground/40"
                style={{
                  width: `${10 * preset.scale}px`,
                  height: `${3 * preset.scale}px`,
                }}
              />
              <span
                className="rounded-full bg-muted-foreground/40"
                style={{
                  width: `${14 * preset.scale}px`,
                  height: `${3 * preset.scale}px`,
                }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {preset.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {preset.description}
              </span>
            </span>
            {isActive && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

function ZoomControl() {
  const { zoom, setZoom } = useZoom()
  return (
    <Combobox
      options={ZOOM_COMBO_OPTIONS}
      value={zoom}
      onChange={(v) => setZoom(v as typeof zoom)}
      placeholder="Selecione o zoom"
      searchPlaceholder="Buscar nível..."
    />
  )
}

function SidebarControl() {
  const { visibility, setVisibility } = useSidebar()
  return (
    <div className="grid grid-cols-1 gap-2">
      {SIDEBAR_OPTIONS.map((option) => {
        const isActive = visibility === option.id
        const OptionIcon = option.id === 'visible' ? PanelLeft : Menu
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setVisibility(option.id)}
            className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors ${
              isActive ? 'border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
              <OptionIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
            {isActive && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

function SidebarColorControl() {
  const { sidebarColor, setSidebarColor } = useSidebar()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {SIDEBAR_COLOR_OPTIONS.map((option) => {
          const isActive = sidebarColor === option.id
          const isWhite = option.id === 'white'
          return (
            <button
              key={option.id}
              type="button"
              aria-label={option.label}
              aria-pressed={isActive}
              onClick={() => setSidebarColor(option.id)}
              style={
                option.icon ? undefined : { backgroundColor: option.swatch }
              }
              className={`grid size-7 place-items-center rounded-full border transition-all hover:scale-110 ${
                isWhite
                  ? 'border-border bg-background text-foreground'
                  : 'border-transparent'
              } ${
                isActive
                  ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                  : ''
              }`}
            >
              {option.icon === 'sun' && <Sun className="size-3.5" />}
            </button>
          )
        })}
      </div>
      <Button
        variant="outline"
        onClick={() => setSidebarColor(DEFAULT_SIDEBAR_COLOR)}
        className="w-full"
      >
        <RotateCcw />
        Restaurar padrão
      </Button>
    </div>
  )
}

function BackgroundToneControl() {
  const { backgroundTone, setBackgroundTone } = useSidebar()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {BACKGROUND_TONE_OPTIONS.map((option) => {
          const isActive = backgroundTone === option.id
          const isWhite = option.id === 'white'
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setBackgroundTone(option.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full border ${
                  isWhite
                    ? 'border-border bg-background text-foreground'
                    : 'border-transparent'
                }`}
                style={
                  option.icon ? undefined : { backgroundColor: option.value }
                }
              >
                {option.icon === 'sun' && <Sun className="size-3.5" />}
              </span>
              <span className="font-medium">{option.label}</span>
              {isActive && <Check className="size-4 shrink-0" />}
            </button>
          )
        })}
      </div>
      <Button
        variant="outline"
        onClick={() => setBackgroundTone(DEFAULT_BACKGROUND_TONE)}
        className="w-full"
      >
        <RotateCcw />
        Restaurar padrão
      </Button>
    </div>
  )
}

function SidebarStyleControl() {
  const { style, setStyle } = useSidebar()
  return (
    <div className="grid grid-cols-1 gap-2">
      {SIDEBAR_STYLE_OPTIONS.map((option) => {
        const isActive = style === option.id
        const isFloating = option.id === 'floating'
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setStyle(option.id)}
            className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors ${
              isActive ? 'border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            {/* Mini-preview: barra encostada (plana) x cartão destacado (flutuante) */}
            <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-card">
              <span
                className={
                  isFloating
                    ? 'absolute inset-y-1 left-1 w-2.5 rounded-[4px] bg-primary/60 shadow-sm'
                    : 'absolute inset-y-0 left-0 w-2.5 bg-primary/60'
                }
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
            {isActive && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

/**
 * O modo compacto é um trilho fixo permanente, então só faz sentido quando a
 * barra está Visível E o estilo é Flutuante. No modo "Oculta" existe apenas o
 * drawer do menu sanduíche, que sempre abre completo — por isso a seção some.
 */
function SidebarModeSection() {
  const { style, visibility } = useSidebar()
  if (style !== 'floating' || visibility !== 'visible') return null
  return (
    <PresetSection
      title="Densidade da barra flutuante"
      description="Completo (com rótulos) ou compacto (só ícones, expandindo ao passar o mouse)."
    >
      <SidebarModeControl />
    </PresetSection>
  )
}

function SidebarModeControl() {
  const { mode, setMode } = useSidebar()
  return (
    <div className="grid grid-cols-1 gap-2">
      {SIDEBAR_MODE_OPTIONS.map((option) => {
        const isActive = mode === option.id
        const isCompact = option.id === 'compact'
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors ${
              isActive ? 'border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            {/* Mini-preview: trilho fino (compacto) x barra larga (completo) */}
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-card">
              <span
                className={
                  isCompact
                    ? 'flex h-5 w-2.5 flex-col items-center justify-center gap-1 rounded-[3px] bg-primary/15'
                    : 'flex h-5 w-5 flex-col items-center justify-center gap-1 rounded-[3px] bg-primary/15'
                }
                aria-hidden
              >
                <span className="size-1 rounded-full bg-primary/70" />
                <span className="size-1 rounded-full bg-primary/70" />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
            {isActive && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

function SidebarMenuEffectControl() {
  const { menuEffect, setMenuEffect } = useSidebar()
  return (
    <div className="grid grid-cols-1 gap-2">
      {SIDEBAR_MENU_EFFECT_OPTIONS.map((option) => {
        const isActive = menuEffect === option.id
        const isSlide = option.id === 'slide'
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setMenuEffect(option.id)}
            className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors ${
              isActive ? 'border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-card">
              <span className="relative flex h-5 w-7 items-center" aria-hidden>
                <span className="absolute left-0 size-2 rounded-full bg-primary/70" />
                <span
                  className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-primary/20 ${
                    isSlide ? 'left-2.5 w-4' : 'left-2 w-3.5'
                  }`}
                />
                {isSlide && (
                  <span className="absolute left-3.5 size-1 rounded-full bg-primary/40" />
                )}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
            {isActive && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

function IconSetControl() {
  const { iconSet, setIconSet } = useIconSet()
  return (
    <div className="grid grid-cols-1 gap-2">
      {ICON_SET_OPTIONS.map((option) => {
        const isActive = iconSet === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setIconSet(option.id)}
            className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors ${
              isActive ? 'border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground">
              {option.id === 'lucide' ? (
                <LayoutGrid className="size-4" />
              ) : (
                <GridViewIcon className="size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
            {isActive && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}
