export type RiskLevel = 'high' | 'medium' | 'low' | 'safe'

export type Language = {
  code: string
  name: string
  nativeName: string
}

export type Clause = {
  id: string
  index: number
  title: string
  text: string
  translatedText?: string
  riskLevel: RiskLevel
  riskScore: number // 0-100
  category: string
  shapTokens: ShapToken[]
  rewrite?: string
  regulations: Regulation[]
  conflicts?: string[]
  retrievedPrecedents: Precedent[]
}

export type ShapToken = {
  word: string
  score: number // negative = lowers risk, positive = raises risk
}

export type Regulation = {
  id: string
  code: string
  title: string
  section: string
  body: 'BNS' | 'SEBI' | 'RBI' | 'Companies Act' | 'IT Act' | 'Indian Contract Act' | 'Arbitration Act' | 'Consumer Protection Act' | 'Specific Relief Act' | 'Limitation Act'
  relevance: number // 0-1
}

export type Precedent = {
  id: string
  title: string
  court: string
  year: number
  summary: string
  relevanceScore: number
}

export type ConflictPair = {
  clauseAId: string
  clauseBId: string
  clauseATitle: string
  clauseBTitle: string
  description: string
  severity: 'critical' | 'warning' | 'info'
}

export type AnalysisResult = {
  documentId: string
  fileName: string
  language: Language
  uploadedAt: string
  processingTime: number
  overallRiskScore: number
  clauses: Clause[]
  conflicts: ConflictPair[]
  summary: string
  riskBreakdown: { high: number; medium: number; low: number; safe: number }
  version: number          // 1 = original, 2+ = AI-approved revisions
  parentDocumentId?: string // links v2 → v1
  rewritesApplied: number  // how many clauses were AI-rewritten
}
