import { AnalysisResult } from '../types'

// Storage service for managing analysis history and exports
export interface StoredAnalysis {
  id: string
  analysis: AnalysisResult
  timestamp: number
  tags?: string[]
}

class StorageService {
  private readonly STORAGE_KEY = 'legal_analyses'
  private readonly MAX_STORAGE = 10 // Store max 10 analyses

  // Save an analysis to localStorage
  saveAnalysis(analysis: AnalysisResult, tags?: string[]): StoredAnalysis {
    const stored: StoredAnalysis = {
      id: `analysis_${Date.now()}`,
      analysis,
      timestamp: Date.now(),
      tags: tags || [],
    }

    let history = this.getHistory()
    history.unshift(stored)
    history = history.slice(0, this.MAX_STORAGE) // Keep only recent ones

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history))
    } catch (e) {
      console.warn('Failed to save analysis to storage:', e)
    }

    return stored
  }

  // Get all stored analyses
  getHistory(): StoredAnalysis[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (e) {
      console.warn('Failed to load history:', e)
      return []
    }
  }

  // Get a specific analysis by ID
  getAnalysis(id: string): StoredAnalysis | null {
    const history = this.getHistory()
    return history.find(item => item.id === id) || null
  }

  // Delete an analysis
  deleteAnalysis(id: string): void {
    let history = this.getHistory()
    history = history.filter(item => item.id !== id)
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history))
    } catch (e) {
      console.warn('Failed to delete analysis:', e)
    }
  }

  // Clear all history
  clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (e) {
      console.warn('Failed to clear history:', e)
    }
  }

  // Get trend data for charts (last N days)
  getTrendData(days: number = 7) {
    const history = this.getHistory()
    const now = Date.now()
    const dayInMs = 24 * 60 * 60 * 1000

    const trends = Array(days)
      .fill(0)
      .map((_, i) => ({
        date: new Date(now - (days - i) * dayInMs).toLocaleDateString(),
        avgRiskScore: 0,
        count: 0,
      }))

    history.forEach(item => {
      const dayIndex = Math.floor((now - item.timestamp) / dayInMs)
      if (dayIndex < days) {
        const idx = days - dayIndex - 1
        trends[idx].avgRiskScore += item.analysis.overallRiskScore
        trends[idx].count++
      }
    })

    return trends.map(t => ({
      date: t.date,
      avgRiskScore: t.count > 0 ? Math.round(t.avgRiskScore / t.count) : 0,
    }))
  }
}

export const storageService = new StorageService()
