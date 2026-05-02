import { AnalysisResult, Language } from '../types'

// Use environment variable if available, otherwise default to local FastAPI server
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const api = {
  /**
   * Sends the document to the FastAPI backend for full ML pipeline analysis.
   */
  analyzeDocument: async (file: File, language: Language): Promise<AnalysisResult> => {
    const formData = new FormData()
    formData.append('file', file)
    // Send the full language object as a JSON string so backend can parse code/name
    formData.append('language', JSON.stringify(language))

    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.detail || `Server Error: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Phase 4: Requests a safer rewrite for a high-risk clause.
   */
  rewriteClause: async (clauseText: string, context: string): Promise<{ rewrite: string }> => {
    const response = await fetch(`${API_BASE}/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clauseText, context }),
    })
    
    if (!response.ok) throw new Error('Failed to generate rewrite.')
    return response.json()
  },

  /**
   * Phase 4: Sends a message to the RAG Chatbot.
   */
  chat: async (message: string, documentContext: string) => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context: documentContext }),
    })
    
    if (!response.ok) throw new Error('Chatbot failed to respond.')
    return response.json()
  },

  /**
   * Phase 4: Exports the full analysis (with rewrites) as a styled .docx report.
   */
  exportDocument: async (analysis: AnalysisResult): Promise<void> => {
    const response = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis }),
    })

    if (!response.ok) throw new Error('Export failed. Please try again.')

    // Trigger browser download of the returned .docx blob
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const disposition = response.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="(.+)"/)
    a.download = match ? match[1] : `NyayaLens_Report.docx`
    a.click()
    URL.revokeObjectURL(url)
  },

  /**
   * Versioning: Approves current rewrites, saves as a new version (v2, v3...) chained to original.
   */
  approveDocument: async (analysis: AnalysisResult): Promise<AnalysisResult> => {
    const response = await fetch(`${API_BASE}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, parentDocumentId: analysis.documentId }),
    })
    if (!response.ok) throw new Error('Approval failed. Please try again.')
    return response.json()
  },

  /**
   * Semantic search across all MongoDB-cached documents.
   * Returns ranked results with matched clause snippets and relevance scores.
   */
  searchDocuments: async (query: string, topK = 5): Promise<{
    query: string
    results: Array<{
      documentId: string
      fileName: string
      overallRiskScore: number
      uploadedAt: string
      language: { code: string; name: string; nativeName: string }
      relevanceScore: number
      matchedClauseTitle: string
      matchedSnippet: string
      clauseCount: number
      riskBreakdown: { high: number; medium: number; low: number; safe: number }
    }>
  }> => {
    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK }),
    })
    if (!response.ok) throw new Error('Search failed. Please try again.')
    return response.json()
  },
}
