'use client'

import { motion, useInView } from 'motion/react'
import { useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'

type OdometerProps = {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}

function formatValue(value: number, decimals: number) {
  if (decimals > 0) {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }
  return Math.round(value).toLocaleString('pt-BR')
}

function RollingDigit({
  digit,
  duration,
  delay,
  animate,
}: {
  digit: number
  duration: number
  delay: number
  animate: boolean
}) {
  return (
    <span
      className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline"
      aria-hidden
    >
      <motion.span
        className="flex flex-col"
        initial={{ y: 0 }}
        animate={{ y: animate ? `-${digit * 10}%` : 0 }}
        transition={{
          duration,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span
            key={n}
            className="flex h-[1em] items-center justify-center leading-none"
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

/** Número com efeito odômetro — cada dígito rola verticalmente até o valor final. */
export function Odometer({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.4,
  className,
}: OdometerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const formatted = useMemo(
    () => formatValue(value, decimals),
    [value, decimals],
  )
  const digits = useMemo(() => formatted.split(''), [formatted])

  let digitIndex = 0

  return (
    <span ref={ref} className={cn('inline-flex items-baseline', className)}>
      {prefix && (
        <span className="mr-0.5 shrink-0 text-[0.72em] font-medium opacity-80">
          {prefix}
        </span>
      )}
      <span className="inline-flex items-baseline" aria-label={formatted}>
        {digits.map((char, index) => {
          if (!/\d/.test(char)) {
            return (
              <span key={`${char}-${index}`} className="inline-block">
                {char}
              </span>
            )
          }
          const digit = Number(char)
          const delay = digitIndex * 0.06
          digitIndex += 1
          return (
            <RollingDigit
              key={`${index}-${char}-${value}`}
              digit={digit}
              duration={duration}
              delay={delay}
              animate={inView}
            />
          )
        })}
      </span>
      {suffix && (
        <span className="ml-0.5 shrink-0 text-[0.72em] font-medium opacity-80">
          {suffix}
        </span>
      )}
    </span>
  )
}
