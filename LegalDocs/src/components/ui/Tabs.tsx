import React, { createContext, useContext, useState } from 'react'
import { cn } from '../../lib/utils'

const TabsContext = createContext<{ active: string; setActive: (v: string) => void }>({
  active: '', setActive: () => {},
})

export const Tabs: React.FC<{ defaultValue: string; children: React.ReactNode; className?: string }> = ({
  defaultValue, children, className,
}) => {
  const [active, setActive] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div
    className={cn('inline-flex items-center gap-1 rounded-xl bg-secondary/60 p-1 border border-border', className)}
    {...props}
  >
    {children}
  </div>
)

export const TabsTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }> = ({
  className, value, children, ...props
}) => {
  const { active, setActive } = useContext(TabsContext)
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
        'text-muted-foreground hover:text-foreground',
        active === value && 'bg-card text-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export const TabsContent: React.FC<React.HTMLAttributes<HTMLDivElement> & { value: string }> = ({
  className, value, children, ...props
}) => {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return (
    <div className={cn('mt-4 animate-fade-in', className)} {...props}>
      {children}
    </div>
  )
}
