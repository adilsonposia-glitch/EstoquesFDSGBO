'use client'

import { Moon, Sun } from '@/components/ui/icons'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label="Alternar tema claro e escuro"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'grid size-9 place-items-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted',
        className,
      )}
    >
      {mounted && isDark ? (
        <Moon className="size-4.5" />
      ) : (
        <Sun className="size-4.5" />
      )}
    </button>
  )
}
