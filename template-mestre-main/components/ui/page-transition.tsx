'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { screenMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

type PageTransitionProps = {
  pageKey: string
  children: ReactNode
  className?: string
}

export function PageTransition({
  pageKey,
  children,
  className,
}: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={screenMotion.initial}
        animate={screenMotion.animate}
        exit={screenMotion.exit}
        transition={screenMotion.transition}
        className={cn(className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
