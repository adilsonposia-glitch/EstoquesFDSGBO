import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AppShell } from '@/components/layout/app-shell'
import { Providers } from '@/components/providers'
import { fontVariables } from '@/lib/fonts'
import { loadPreset } from '@/lib/preset-store'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nova UI — Design System',
  description:
    'Sistema de design profissional com componentes reutilizáveis, paletas de cores, dark mode e gráficos.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Lê o preset salvo no banco (retorna null enquanto DATABASE_URL não existir).
  const initialPreset = await loadPreset()

  return (
    <html
      lang="pt-BR"
      data-palette="emerald"
      className={`${fontVariables} bg-background`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Providers initialPreset={initialPreset}>
          <AppShell>{children}</AppShell>
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
