'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { screenMotion } from '@/lib/motion'

type TabsContextValue = {
  value: string
  setValue: (v: string) => void
  groupId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)
const TabsAnimatedContext = createContext(false)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs.* deve ser usado dentro de <Tabs>')
  return ctx
}

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: ReactNode
}) {
  const [internal, setInternal] = useState(defaultValue)
  const value = controlled ?? internal
  const groupId = useId()

  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v)
    onValueChange?.(v)
  }

  return (
    <TabsContext.Provider value={{ value, setValue, groupId }}>
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-muted p-1 text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: ReactNode
}) {
  const { value: active, setValue, groupId } = useTabs()
  const selected = active === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => setValue(value)}
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/50',
        selected
          ? 'font-semibold text-primary'
          : 'font-medium hover:text-foreground',
        className,
      )}
    >
      {selected && (
        <motion.span
          layoutId={`tab-indicator-${groupId}`}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute inset-0 -z-10 rounded-lg bg-background shadow-sm"
        />
      )}
      {children}
    </button>
  )
}

export function TabsPanel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const { value: active } = useTabs()

  const activePanel = Children.toArray(children).find((child) => {
    if (!isValidElement<{ value?: string }>(child)) return false
    return child.props.value === active
  }) as ReactElement<{ value?: string; className?: string; children: ReactNode }> | undefined

  return (
    <TabsAnimatedContext.Provider value={true}>
      <div className={className}>
        <AnimatePresence mode="wait" initial={false}>
          {activePanel && (
            <motion.div
              key={active}
              initial={screenMotion.initial}
              animate={screenMotion.animate}
              exit={screenMotion.exit}
              transition={screenMotion.transition}
            >
              {activePanel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TabsAnimatedContext.Provider>
  )
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: ReactNode
}) {
  const { value: active } = useTabs()
  const animated = useContext(TabsAnimatedContext)

  if (animated) {
    return (
      <div role="tabpanel" className={cn('text-sm', className)}>
        {children}
      </div>
    )
  }

  if (active !== value) return null

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={value}
        role="tabpanel"
        initial={screenMotion.initial}
        animate={screenMotion.animate}
        exit={screenMotion.exit}
        transition={screenMotion.transition}
        className={cn('text-sm', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
