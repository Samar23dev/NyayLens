import React from 'react'
import { cn } from '../../lib/utils'

export const Separator: React.FC<React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }> = ({
  className, orientation = 'horizontal', ...props
}) => (
  <div
    className={cn(
      'bg-border shrink-0',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
    {...props}
  />
)

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'outline' }> = ({
  className, variant = 'default', children, ...props
}) => {
  const variants = {
    default: 'bg-primary/20 text-primary border-primary/30',
    secondary: 'bg-secondary text-secondary-foreground border-border',
    outline: 'border-border text-muted-foreground',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
