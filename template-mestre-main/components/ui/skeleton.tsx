import { cn } from '@/lib/utils'

/**
 * Placeholder animado para conteúdo em carregamento. Usa o token de cor
 * `muted` e a animação de pulso, respeitando o tema/paleta ativos.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}
