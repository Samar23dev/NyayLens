import React from 'react'
import { cn } from '../../lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  colorClass?: string
}

export const Progress: React.FC<ProgressProps> = ({
  className, value = 0, max = 100, colorClass = 'bg-primary', ...props
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
