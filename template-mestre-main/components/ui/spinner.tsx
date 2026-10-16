import { cn } from '@/lib/utils'

const SIZES = {
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
} as const

/**
 * Indicador de carregamento circular. SVG puro com `animate-spin`, então não
 * depende da biblioteca de ícones ativa. Herda a cor via `currentColor`.
 */
export function Spinner({
  size = 'md',
  className,
  label = 'Carregando…',
}: {
  size?: keyof typeof SIZES
  className?: string
  label?: string
}) {
  const px = SIZES[size]
  return (
    <span role="status" className={cn('inline-flex text-primary', className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
          className="opacity-20"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
