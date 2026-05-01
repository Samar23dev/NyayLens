import { AnalysisResult } from '../types'

// Export service for PDF and CSV formats
class ExportService {
  // Export to CSV format
  exportToCSV(analysis: AnalysisResult): string {
    const headers = ['Clause ID', 'Title', 'Category', 'Risk Level', 'Risk Score', 'Text']
    const rows = analysis.clauses.map(c => [
      c.id,
      c.title,
      c.category,
      c.riskLevel,
      c.riskScore,
      `"${c.text.replace(/"/g, '""')}"`, // Escape quotes in CSV
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    return csv
  }

  // Export to JSON format
  exportToJSON(analysis: AnalysisResult): string {
    return JSON.stringify(analysis, null, 2)
  }

  // Generate a text report
  generateReport(analysis: AnalysisResult): string {
    let report = `
═══════════════════════════════════════════════════════════════════
LEGAL CONTRACT ANALYSIS REPORT
═══════════════════════════════════════════════════════════════════

Document: ${analysis.fileName}
Language: ${analysis.language.name}
Analyzed: ${new Date(analysis.uploadedAt).toLocaleString()}
Processing Time: ${analysis.processingTime}s

─────────────────────────────────────────────────────────────────
RISK SUMMARY
─────────────────────────────────────────────────────────────────
Overall Risk Score: ${analysis.overallRiskScore}/100
  ├─ High Risk:   ${analysis.riskBreakdown.high} clauses
  ├─ Medium Risk: ${analysis.riskBreakdown.medium} clauses
  ├─ Low Risk:    ${analysis.riskBreakdown.low} clauses
  └─ Safe:        ${analysis.riskBreakdown.safe} clauses

EXECUTIVE SUMMARY:
${analysis.summary}

─────────────────────────────────────────────────────────────────
DETECTED CONFLICTS (${analysis.conflicts.length})
─────────────────────────────────────────────────────────────────
${
  analysis.conflicts.length > 0
    ? analysis.conflicts
        .map(
          (c, i) => `
${i + 1}. ${c.clauseATitle} vs ${c.clauseBTitle}
   Severity: ${c.severity.toUpperCase()}
   Issue: ${c.description}
`
        )
        .join('\n')
    : 'No conflicts detected.'
}

─────────────────────────────────────────────────────────────────
HIGH-RISK CLAUSES
─────────────────────────────────────────────────────────────────
${
  analysis.clauses
    .filter(c => c.riskLevel === 'high')
    .map(
      (c, i) => `
${i + 1}. ${c.title} (Section ${c.index + 1})
   Risk Score: ${c.riskScore}/100
   Category: ${c.category}
   Text: ${c.text.substring(0, 200)}...
   ${c.rewrite ? `\n   RECOMMENDED FIX:\n   ${c.rewrite}` : ''}
`
    )
    .join('\n')
}

═════════════════════════════════════════════════════════════════════
End of Report
═════════════════════════════════════════════════════════════════════
    `.trim()
    return report
  }

  // Download file helper
  downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download CSV
  downloadCSV(analysis: AnalysisResult) {
    const csv = this.exportToCSV(analysis)
    const filename = `contract_analysis_${Date.now()}.csv`
    this.downloadFile(csv, filename, 'text/csv')
  }

  // Download JSON
  downloadJSON(analysis: AnalysisResult) {
    const json = this.exportToJSON(analysis)
    const filename = `contract_analysis_${Date.now()}.json`
    this.downloadFile(json, filename, 'application/json')
  }

  // Download Report
  downloadReport(analysis: AnalysisResult) {
    const report = this.generateReport(analysis)
    const filename = `contract_analysis_report_${Date.now()}.txt`
    this.downloadFile(report, filename, 'text/plain')
  }
}

export const exportService = new ExportService()
