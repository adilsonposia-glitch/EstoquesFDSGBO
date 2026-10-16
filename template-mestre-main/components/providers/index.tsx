'use client'

import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/components/ui/toast'
import type { AppPreset } from '@/lib/preset'
import { DensityProvider } from './density-provider'
import { IconSetProvider } from './icon-set-provider'
import { PaletteProvider } from './palette-provider'
import { PresetHydrator } from './preset-hydrator'
import { RadiusProvider } from './radius-provider'
import { ShadowProvider } from './shadow-provider'
import { SidebarProvider } from './sidebar-provider'
import { ZoomProvider } from './zoom-provider'

export function Providers({
  children,
  initialPreset = null,
}: {
  children: React.ReactNode
  /** Preset carregado do banco de dados (server-side). Null = usa localStorage. */
  initialPreset?: AppPreset | null
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <PaletteProvider>
        <RadiusProvider>
          <ShadowProvider>
            <DensityProvider>
              <ZoomProvider>
                <SidebarProvider>
                  <IconSetProvider>
                    <ToastProvider>
                      <PresetHydrator initialPreset={initialPreset}>
                        {children}
                      </PresetHydrator>
                    </ToastProvider>
                  </IconSetProvider>
                </SidebarProvider>
              </ZoomProvider>
            </DensityProvider>
          </ShadowProvider>
        </RadiusProvider>
      </PaletteProvider>
    </ThemeProvider>
  )
}
