import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { RiskLevel } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRiskColor(level: RiskLevel) {
  switch (level) {
    case 'high': return 'text-red-400'
    case 'medium': return 'text-amber-400'
    case 'low': return 'text-blue-400'
    case 'safe': return 'text-emerald-400'
  }
}

export function getRiskBg(level: RiskLevel) {
  switch (level) {
    case 'high': return 'bg-red-500/10 border-red-500/30'
    case 'medium': return 'bg-amber-500/10 border-amber-500/30'
    case 'low': return 'bg-blue-500/10 border-blue-500/30'
    case 'safe': return 'bg-emerald-500/10 border-emerald-500/30'
  }
}

export function getRiskBarColor(score: number) {
  if (score >= 70) return 'bg-red-500'
  if (score >= 40) return 'bg-amber-500'
  if (score >= 20) return 'bg-blue-400'
  return 'bg-emerald-500'
}

export function getRiskHeatColor(level: RiskLevel): string {
  switch (level) {
    case 'high': return 'rgba(239,68,68,0.25)'
    case 'medium': return 'rgba(245,158,11,0.20)'
    case 'low': return 'rgba(96,165,250,0.15)'
    case 'safe': return 'rgba(34,197,94,0.10)'
  }
}

export function getRiskLabel(level: RiskLevel) {
  switch (level) {
    case 'high': return 'High Risk'
    case 'medium': return 'Caution'
    case 'low': return 'Low Risk'
    case 'safe': return 'Safe'
  }
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
