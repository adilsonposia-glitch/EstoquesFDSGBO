'use client'

import { useTheme } from 'next-themes'
import { Check, Moon, Sun } from '@/components/ui/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePalette } from '@/components/providers/palette-provider'
import { PALETTES } from '@/lib/palettes'
import { cn } from '@/lib/utils'

const SWATCHES = [
  { token: 'bg-primary', label: 'Primary' },
  { token: 'bg-secondary', label: 'Secondary' },
  { token: 'bg-accent', label: 'Accent' },
  { token: 'bg-muted', label: 'Muted' },
  { token: 'bg-card', label: 'Card' },
  { token: 'bg-success', label: 'Success' },
  { token: 'bg-destructive', label: 'Destructive' },
  { token: 'bg-foreground', label: 'Foreground' },
]

export function CoresView() {
  const { palette, setPalette } = usePalette()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Modo claro / escuro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
          <CardDescription>Alterne entre modo claro e escuro.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-2 gap-3">
            <ModeButton
              active={theme !== 'dark'}
              onClick={() => setTheme('light')}
              icon={<Sun className="size-5" />}
              label="Modo claro"
            />
            <ModeButton
              active={theme === 'dark'}
              onClick={() => setTheme('dark')}
              icon={<Moon className="size-5" />}
              label="Modo escuro"
            />
          </div>
        </CardContent>
      </Card>

      {/* Paleta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paleta de cores</CardTitle>
          <CardDescription>
            Escolha uma paleta — ela é aplicada instantaneamente em todo o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                className={cn(
                  'group flex flex-col gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/50',
                  palette === p.id ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  {palette === p.id && <Check className="size-4 text-primary" />}
                </div>
                <div className="flex gap-1.5">
                  {p.preview.map((c, i) => (
                    <span
                      key={i}
                      className="size-7 rounded-full border border-border/50"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tokens semânticos</CardTitle>
          <CardDescription>Variáveis de design usadas em todos os componentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SWATCHES.map((s) => (
              <div key={s.token} className="flex flex-col gap-2">
                <div className={cn('h-16 rounded-lg border border-border', s.token)} />
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-4 transition-all',
        active ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'grid size-10 place-items-center rounded-lg',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
