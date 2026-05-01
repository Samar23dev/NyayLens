import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { AnalysisResult, Language } from '../types'
import { api } from './api'
import { storageService, StoredAnalysis } from './storageService'
import { errorHandler } from './errorHandler'

type AnalysisContextType = {
  currentAnalysis: AnalysisResult | null
  currentFileUrl: string | null
  isAnalyzing: boolean
  analyzeDocument: (file: File | null, lang: Language) => Promise<boolean>
  compareAnalyses: (id1: string, id2: string) => AnalysisResult[] | null
  setCurrentAnalysis: (analysis: AnalysisResult | null) => void
  updateClause: (clauseId: string, data: Partial<import('../types').Clause>) => void
  saveCurrentAnalysis: (tags?: string[]) => void
  deleteAnalysis: (id: string) => void
  clearHistory: () => void
  getHistory: () => ReturnType<typeof storageService.getHistory>
  error: string | null
  clearError: () => void
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const updateClause = useCallback((clauseId: string, data: Partial<import('../types').Clause>) => {
    setCurrentAnalysis(prev => {
      if (!prev) return prev
      return {
        ...prev,
        clauses: prev.clauses.map(c => c.id === clauseId ? { ...c, ...data } : c)
      }
    })
  }, [])

  const analyzeDocument = useCallback(
    async (file: File | null, lang: Language) => {
      setIsAnalyzing(true)
      setError(null)

      try {
        let actualFile = file
        if (!actualFile) {
          actualFile = new File([`EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is made and entered into on this 24th day of April 2026, by and between TechCorp Inc. ("Company") and Jane Doe ("Employee").

1. Position and Duties. Employee is hired as a Software Engineer.
2. Confidentiality. Employee agrees not to disclose any confidential information. A breach of this will result in immediate termination and penalty of $100,000.
3. Non-Compete. Employee agrees not to work for any competitor for 2 years after termination.
4. Termination. The Company may terminate this agreement at any time without notice.
5. Liability. Employee shall indemnify the Company against any damages.`], 'Employment_Contract_Demo.txt', { type: 'text/plain' })
        }

        // Send the file to the new FastAPI backend pipeline
        const result = await api.analyzeDocument(actualFile, lang)
        setCurrentAnalysis(result as AnalysisResult)
        
        // Store a blob URL so we can open the original PDF in a new tab
        // Cleanup old URL before creating new one
        setCurrentFileUrl(prevUrl => {
          if (prevUrl) URL.revokeObjectURL(prevUrl)
          return URL.createObjectURL(actualFile)
        })
        
        // Only save to history if it's a real file upload
        if (file !== null) {
          storageService.saveAnalysis(result as AnalysisResult)
        }
        
        setError(null)
        return true
      } catch (e) {
        const message = errorHandler.getErrorMessage(e)
        setError(message)
        console.error('Analysis failed:', e)
        setCurrentAnalysis(null)
        return false
      } finally {
        setIsAnalyzing(false)
      }
    },
    [] // No dependencies needed - all state setters are stable
  )

  const saveCurrentAnalysis = useCallback(
    (tags?: string[]) => {
      if (!currentAnalysis) {
        setError('No analysis to save')
        return
      }
      try {
        storageService.saveAnalysis(currentAnalysis, tags)
        setError(null)
      } catch (e) {
        setError('Failed to save analysis')
      }
    },
    [currentAnalysis]
  )

  const deleteAnalysis = useCallback((id: string) => {
    try {
      storageService.deleteAnalysis(id)
      setError(null)
    } catch (e) {
      setError('Failed to delete analysis')
    }
  }, [])

  const compareAnalyses = useCallback((id1: string, id2: string): AnalysisResult[] | null => {
    try {
      const analysis1 = storageService.getAnalysis(id1)
      const analysis2 = storageService.getAnalysis(id2)

      if (!analysis1 || !analysis2) {
        setError('One or both analyses not found')
        return null
      }

      return [analysis1.analysis, analysis2.analysis]
    } catch (e) {
      setError('Failed to compare analyses')
      return null
    }
  }, [])

  const getHistory = useCallback(() => {
    return storageService.getHistory()
  }, [])

  const clearHistory = useCallback(() => {
    try {
      storageService.clearHistory()
      setError(null)
    } catch (e) {
      setError('Failed to clear history')
    }
  }, [])

  return (
    <AnalysisContext.Provider
      value={{
        currentAnalysis,
        currentFileUrl,
        isAnalyzing,
        analyzeDocument,
        compareAnalyses,
        getHistory,
        clearHistory,
        setCurrentAnalysis,
        updateClause,
        saveCurrentAnalysis,
        deleteAnalysis,
        error,
        clearError,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}


export function useAnalysis() {
  const context = useContext(AnalysisContext)
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider')
  }
  return context
}
