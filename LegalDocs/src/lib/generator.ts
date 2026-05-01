import { AnalysisResult, Clause, Language } from '../types'

// If the user has VITE_GEMINI_API_KEY in .env, use it!
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || ''
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function generateAnalysis(
  text: string,
  file: File,
  lang: Language
): Promise<AnalysisResult> {
  const t0 = performance.now()
  let result: Partial<AnalysisResult> | null = null

  if (API_KEY) {
    try {
      result = await runLLMAnalysis(text, lang)
    } catch (err) {
      console.error('LLM API error, falling back to heuristic:', err)
      result = runHeuristicAnalysis(text, lang)
    }
  } else {
    // Use heuristic analysis based on actual text
    result = runHeuristicAnalysis(text, lang)
    }

    const t1 = performance.now()

    return {
        documentId: 'doc-' + Date.now(),
        fileName: file.name,
        language: lang,
        uploadedAt: new Date().toISOString(),
        processingTime: Number(((t1 - t0) / 1000).toFixed(2)),
        overallRiskScore: result?.overallRiskScore ?? 50,
        clauses: result?.clauses ?? [],
        conflicts: result?.conflicts ?? [],
        summary: result?.summary ?? 'Analysis completed.',
        riskBreakdown: result?.riskBreakdown ?? { high: 0, medium: 0, low: 0, safe: 0 },
        version: 1,
        rewritesApplied: 0
    }
}

async function runLLMAnalysis(text: string, lang: Language): Promise<Partial<AnalysisResult>> {
  const prompt = `Analyze this legal document text and output a JSON object matching this TypeScript interface exactly:
type AnalysisResult = {
  overallRiskScore: number
  summary: string
  clauses: {
    id: string
    index: number
    title: string
    text: string
    riskLevel: 'high' | 'medium' | 'low' | 'safe'
    riskScore: number
    category: string
    shapTokens: { word: string; score: number }[]
    regulations: { id: string; code: string; title: string; section: string; body: string; relevance: number }[]
    retrievedPrecedents: { id: string; title: string; court: string; year: number; summary: string; relevanceScore: number }[]
  }[]
  conflicts: { clauseAId: string; clauseBId: string; clauseATitle: string; clauseBTitle: string; description: string; severity: 'critical'|'warning'|'info' }[]
}

Document text:
${text.substring(0, 15000)}

Make the clauses array have at least 5-10 realistic clauses derived directly from the document text above. Write the summary in ${lang.name} language, explaining the general risks.`

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'LegalDocs',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const responseText = data.choices[0].message.content

  const maybeJson = responseText.replace(/```json\n?/, '').replace(/```\n?/, '').trim()
  const parsed = JSON.parse(maybeJson)

  // Compute breakdown
  const breakdown = { high: 0, medium: 0, low: 0, safe: 0 }
  parsed.clauses?.forEach((c: any) => {
    const level = c.riskLevel as keyof typeof breakdown
    if (breakdown[level] !== undefined) breakdown[level]++
  })

    return {
        ...parsed,
        riskBreakdown: breakdown,
    }
}

// Fallback logic that ACTUALLY uses the document text for analysis rather than hardcoded 
function runHeuristicAnalysis(text: string, lang: Language): Partial<AnalysisResult> {
    // Split into pseudo-paragraphs/clauses
    const rawParts = text.split(/\n\s*\n/).map(t => t.trim()).filter(t => t.length > 30)

    const categories = ['Administrative', 'Financial', 'Termination', 'Liability', 'Confidentiality', 'IP', 'Restrictive Covenant']
    const riskyWords = ['terminate', 'liability', 'indemnify', 'breach', 'damage', 'null', 'void', 'penalty']

    let overallScore = 0

    const clauses: Clause[] = rawParts.map((t, i) => {
        let riskTokens = 0
        const matchedTokens: { word: string, score: number }[] = []
        riskyWords.forEach(word => {
            const regex = new RegExp(word, 'gi')
            const matches = t.match(regex)
            if (matches) {
                riskTokens += matches.length
                matchedTokens.push({ word, score: 0.15 * matches.length })
            }
        })

        // Calculate risk
        let riskLevel: 'safe' | 'low' | 'medium' | 'high' = 'safe'
        let riskScore = 10 + Math.min(riskTokens * 15, 80)
        if (riskScore > 75) riskLevel = 'high'
        else if (riskScore > 40) riskLevel = 'medium'
        else if (riskScore > 20) riskLevel = 'low'

        overallScore += riskScore

        return {
            id: `c-${i}`,
            index: i,
            title: `Section ${i + 1}`,
            text: t,
            category: categories[i % categories.length],
            riskLevel,
            riskScore,
            shapTokens: matchedTokens,
            regulations: [],
            retrievedPrecedents: [],
        }
    })

    // ensure we have at least 1 mock clause if empty doc
    if (clauses.length === 0) {
        clauses.push({
            id: 'c-0',
            index: 0,
            title: 'Section 1',
            text: 'No clauses could be extracted from the document.',
            category: 'Administrative',
            riskLevel: 'safe',
            riskScore: 10,
            shapTokens: [],
            regulations: [],
            retrievedPrecedents: [],
        })
        overallScore = clauses[0].riskScore
    }

    overallScore = Math.round(overallScore / clauses.length)

    const breakdown = { high: 0, medium: 0, low: 0, safe: 0 }
    clauses.forEach(c => breakdown[c.riskLevel]++)

    const summary = `Extracted ${clauses.length} clauses from the uploaded document. ` +
        (overallScore > 50 ? 'The document contains several high-risk items requiring review.' : 'The document appears standard with typical terms.')

    return {
        overallRiskScore: overallScore,
        summary: summary,
        clauses: clauses.slice(0, 15), // cap to 15 chunks
        conflicts: [],
        riskBreakdown: breakdown,
    }
}
