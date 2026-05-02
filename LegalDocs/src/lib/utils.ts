import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { RiskLevel } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Text colour for a risk level.
 * Uses -500 shade (readable on both light + dark backgrounds).
 */
export function getRiskColor(level: RiskLevel) {
  switch (level) {
    case 'high':   return 'text-red-500   dark:text-red-400'
    case 'medium': return 'text-amber-600 dark:text-amber-400'
    case 'low':    return 'text-blue-600  dark:text-blue-400'
    case 'safe':   return 'text-emerald-600 dark:text-emerald-400'
  }
}

/**
 * Background + border tint for a risk level badge/card.
 */
export function getRiskBg(level: RiskLevel) {
  switch (level) {
    case 'high':   return 'bg-red-50    border-red-200   dark:bg-red-500/10    dark:border-red-500/30'
    case 'medium': return 'bg-amber-50  border-amber-200 dark:bg-amber-500/10  dark:border-amber-500/30'
    case 'low':    return 'bg-blue-50   border-blue-200  dark:bg-blue-500/10   dark:border-blue-500/30'
    case 'safe':   return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
  }
}

/**
 * Progress bar fill colour keyed by numeric score.
 */
export function getRiskBarColor(score: number) {
  if (score >= 70) return 'bg-red-500'
  if (score >= 40) return 'bg-amber-500'
  if (score >= 20) return 'bg-blue-400'
  return 'bg-emerald-500'
}

/**
 * Inline RGBA heat colour for the document heatmap overlay.
 * Slightly more opaque in general to work on light backgrounds too.
 */
export function getRiskHeatColor(level: RiskLevel): string {
  switch (level) {
    case 'high':   return 'rgba(239,68,68,0.20)'
    case 'medium': return 'rgba(245,158,11,0.18)'
    case 'low':    return 'rgba(96,165,250,0.15)'
    case 'safe':   return 'rgba(34,197,94,0.10)'
  }
}

export function getRiskLabel(level: RiskLevel) {
  switch (level) {
    case 'high':   return 'High Risk'
    case 'medium': return 'Caution'
    case 'low':    return 'Low Risk'
    case 'safe':   return 'Safe'
  }
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
