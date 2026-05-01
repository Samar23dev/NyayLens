import React from 'react'
import { cn } from '../../lib/utils'
import { RiskLevel } from '../../types'
import { getRiskColor, getRiskBg, getRiskLabel } from '../../lib/utils'
import { AlertTriangle, CheckCircle2, AlertCircle, Shield } from 'lucide-react'

interface RiskBadgeProps {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const icons = {
  high: AlertTriangle,
  medium: AlertCircle,
  low: Shield,
  safe: CheckCircle2,
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level, size = 'md', showIcon = true, className,
}) => {
  const Icon = icons[level]
  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }
  const iconSizes = { sm: 10, md: 12, lg: 14 }

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      getRiskColor(level), getRiskBg(level),
      sizes[size], className,
    )}>
      {showIcon && <Icon size={iconSizes[size]} />}
      {getRiskLabel(level)}
    </span>
  )
}
