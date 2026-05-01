import { AnalysisResult, Clause } from '../types'

// Recommendation service for suggesting improvements
interface Recommendation {
  clauseId: string
  title: string
  severity: 'critical' | 'warning' | 'info'
  issue: string
  suggestion: string
  negotiationPoints: string[]
}

class RecommendationService {
  generateRecommendations(analysis: AnalysisResult): Recommendation[] {
    const recommendations: Recommendation[] = []

    analysis.clauses.forEach(clause => {
      if (clause.riskLevel === 'high') {
        // Critical issues
        const rec = this.generateClauseRecommendation(clause)
        if (rec) recommendations.push(rec)
      }
    })

    // Sort by severity
    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }

  private generateClauseRecommendation(clause: Clause): Recommendation | null {
    const riskKeywords = {
      unlimited: { issue: 'Unlimited liability without caps', suggestion: 'Add liability caps (typically 2-3x annual costs)' },
      'at any time': { issue: 'Termination without cause or notice', suggestion: 'Require 30-60 days notice and valid grounds for termination' },
      perpetuity: { issue: 'Obligations that extend indefinitely', suggestion: 'Add reasonable time limits (e.g., 2-5 years)' },
      'sole discretion': { issue: 'Unilateral decision-making power', suggestion: 'Require mutual consent or third-party arbitration' },
      'no liability': { issue: 'Complete waiver of responsibility', suggestion: 'Maintain liability for gross negligence and intentional acts' },
      irrevocably: { issue: 'Irreversible assignment of rights', suggestion: 'Make assignment conditional or limited in scope' },
      'without cause': { issue: 'Employment can be terminated arbitrarily', suggestion: 'Require documented cause and fair procedure' },
      'hold harmless': { issue: 'Broad indemnification clause', suggestion: 'Limit to direct damages and exclude negligence by other party' },
    }

    for (const [keyword, details] of Object.entries(riskKeywords)) {
      if (clause.text.toLowerCase().includes(keyword.toLowerCase())) {
        return {
          clauseId: clause.id,
          title: clause.title,
          severity: 'critical',
          issue: details.issue,
          suggestion: details.suggestion,
          negotiationPoints: this.getNegotiationPoints(clause),
        }
      }
    }

    return null
  }

  private getNegotiationPoints(clause: Clause): string[] {
    const points: string[] = []

    if (clause.text.toLowerCase().includes('exclude') || clause.text.toLowerCase().includes('exempt')) {
      points.push('Clarify what specific situations or parties are excluded')
    }

    if (clause.text.toLowerCase().includes('reasonably')) {
      points.push('Define "reasonably" with objective criteria')
    }

    if (clause.text.toLowerCase().includes('discretion')) {
      points.push('Replace discretion with objective standards or mutual consent')
    }

    if (clause.text.toLowerCase().includes('prior')) {
      points.push('Specify the notice requirement (e.g., "30 days prior written notice")')
    }

    if (clause.riskScore > 70) {
      points.push('Propose limiting this clause to specific circumstances')
      points.push('Add protections for the weaker party')
    }

    return points.slice(0, 3) // Limit to 3 key points
  }

  // Generate a negotiation summary
  getNegotiationSummary(analysis: AnalysisResult): string {
    const highRiskClauses = analysis.clauses.filter(c => c.riskLevel === 'high')
    const mediumRiskClauses = analysis.clauses.filter(c => c.riskLevel === 'medium')

    const summary = `
NEGOTIATION STRATEGY

Priority 1: Address ${highRiskClauses.length} High-Risk Clauses
These clauses significantly favor one party and should be the focus of negotiations.
${highRiskClauses.slice(0, 3).map(c => `• ${c.title}: Request ${c.rewrite ? 'rewrite as proposed' : 'modification of terms'}`).join('\n')}

Priority 2: Review ${mediumRiskClauses.length} Medium-Risk Clauses
These clauses have some concerns but may be acceptable with clarifications.
${mediumRiskClauses.slice(0, 3).map(c => `• ${c.title}: Clarify scope and limits`).join('\n')}

Overall Recommendation:
${
  analysis.overallRiskScore > 70
    ? 'This contract has significant risks. We recommend extensive negotiations before signing.'
    : analysis.overallRiskScore > 40
      ? 'This contract is moderately risky. Focus negotiations on high-risk clauses.'
      : 'This contract is relatively balanced. Minor clarifications may be needed.'
}
    `.trim()

    return summary
  }
}

export const recommendationService = new RecommendationService()
