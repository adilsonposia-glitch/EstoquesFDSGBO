'use client'

import { useState } from 'react'
import { applyMask, type MaskType } from '@/lib/masks'
import { cn } from '@/lib/utils'

type MaskedInputProps = Omit<
  React.ComponentProps<'input'>,
  'onChange' | 'value' | 'defaultValue'
> & {
  mask: MaskType
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Adorno à esquerda, ex.: "R$" ou um ícone */
  leading?: React.ReactNode
}

export function MaskedInput({
  mask,
  value,
  defaultValue = '',
  onValueChange,
  leading,
  className,
  inputMode,
  ...props
}: MaskedInputProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(() =>
    defaultValue ? applyMask(mask, defaultValue) : '',
  )
  const displayed = isControlled ? applyMask(mask, value ?? '') : internal

  const resolvedInputMode =
    inputMode ??
    (mask === 'email' ? 'email' : mask === 'phone' ? 'tel' : 'numeric')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(mask, e.target.value)
    if (!isControlled) setInternal(masked)
    onValueChange?.(masked)
  }

  return (
    <div
      style={{
        paddingInline: 'var(--field-px)',
        paddingBlock: 'var(--field-py)',
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl border border-input bg-background text-sm shadow-sm transition-all',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25',
        className,
      )}
    >
      {leading && (
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          {leading}
        </span>
      )}
      <input
        {...props}
        inputMode={resolvedInputMode}
        value={displayed}
        onChange={handleChange}
        className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
