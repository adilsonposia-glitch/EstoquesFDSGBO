'use client'

import { Check, Minus } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

type CheckboxProps = {
  checked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
}

function Checkbox({
  checked = false,
  onCheckedChange,
  disabled,
  id,
  className,
  ...props
}: CheckboxProps) {
  const isChecked = checked === true || checked === 'indeterminate'
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked === 'indeterminate' ? 'mixed' : isChecked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!isChecked)}
      data-slot="checkbox"
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-input shadow-sm transition-all outline-none',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isChecked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-background hover:border-ring/60',
        className,
      )}
      {...props}
    >
      {checked === 'indeterminate' ? (
        <Minus className="size-3.5" strokeWidth={3} />
      ) : isChecked ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : null}
    </button>
  )
}

export { Checkbox }
