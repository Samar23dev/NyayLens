import { AnalysisResult } from '../types'
import { api } from './api'

export async function getChatResponse(
  userMessage: string,
  analysisData: AnalysisResult | null,
  chatHistory: { role: string, content: string }[] = []
): Promise<string> {
  try {
    // Build context string from the structured analysis data
    const documentContext = analysisData
      ? `File: ${analysisData.fileName}\nOverall Risk: ${analysisData.overallRiskScore}/100\n\nHigh Risk Clauses:\n${analysisData.clauses.filter(c => c.riskLevel === 'high').map(c => `[Section ${c.index + 1}: ${c.title}]\n${c.text}`).join('\n\n')}\n\nFull Document Context:\n${analysisData.clauses.map(c => `[Section ${c.index + 1}: ${c.title}]\n${c.text}`).join('\n\n')}`
      : 'No document context provided.'

    // If chat history exists, we append the previous turns into the context block to mimic memory
    const historyContext = chatHistory.length > 0 
      ? `\n\nPrevious Conversation:\n${chatHistory.map(h => `${h.role === 'user' ? 'User' : 'NyayaLens'}: ${h.content}`).join('\n')}`
      : ''

    // Send the user's message and the massive context to our FastAPI server
    const response = await api.chat(userMessage, documentContext + historyContext)
    return response.reply || 'Sorry, no response received.'
  } catch (error) {
    console.error('Chat API error:', error)
    return 'Sorry, I encountered an error connecting to the NyayaLens backend. Please check if the server is running.'
  }
}

export function generateSmartSuggestedQuestions(analysisData: AnalysisResult | null): string[] {
  if (!analysisData) {
    return [
      'What are the key risks in this contract?',
      'Which clauses need immediate attention?',
      'Are there any conflicting terms?',
      'What should I negotiate?',
      'Is this contract fair to both parties?',
    ]
  }

  const suggestions: string[] = []

  // Add questions based on overall risk
  if (analysisData.overallRiskScore > 70) {
    suggestions.push('What are the highest-risk clauses I should focus on?')
  }

  // Add questions based on specific high-risk clauses
  const highRiskClauses = analysisData.clauses.filter(c => c.riskLevel === 'high')
  if (highRiskClauses.length > 0) {
    suggestions.push(`How can I mitigate the risks in the ${highRiskClauses[0].title}?`)
    if (highRiskClauses.length > 1) {
      suggestions.push(`What's the difference between the ${highRiskClauses[0].title} and ${highRiskClauses[1].title}?`)
    }
  }

  // Add questions based on conflicts
  if (analysisData.conflicts.length > 0) {
    suggestions.push(`How do I resolve the conflict between "${analysisData.conflicts[0].clauseATitle}" and "${analysisData.conflicts[0].clauseBTitle}"?`)
  }

  // Add general questions
  suggestions.push('What are the standard terms for this type of contract?')
  suggestions.push('Which clauses are negotiable?')
  suggestions.push('What red flags should I look for?')

  // Return unique suggestions, limited to 8
  return [...new Set(suggestions)].slice(0, 8)
}
