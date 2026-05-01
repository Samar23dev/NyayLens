import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Clock, ChevronRight, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { RiskBadge } from '../components/ui/RiskBadge'
import { Progress } from '../components/ui/Progress'
import { Button } from '../components/ui/Button'
import { cn, getRiskBarColor } from '../lib/utils'
import { useAnalysis } from '../lib/AnalysisContext'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export function HistoryPage() {
  const { getHistory, setCurrentAnalysis, clearHistory } = useAnalysis()
  const navigate = useNavigate()
  const [history, setHistory] = useState(getHistory())
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSelect = (analysis: any) => {
    setCurrentAnalysis(analysis)
    navigate('/dashboard')
  }

  const handleClearHistory = () => {
    clearHistory()
    setHistory([])
    setShowConfirm(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analysis History</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {history.length} documents analysed · Powered by NyayaLens
            </p>
          </div>
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(true)}
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 size={14} />
              Clear History
            </Button>
          )}
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">Clear All History?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will permanently delete all {history.length} saved analyses. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleClearHistory}
                >
                  <Trash2 size={14} />
                  Clear All
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aggregate stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Documents', value: history.length, color: 'text-primary' },
          { label: 'Avg Risk Score', value: history.length > 0 ? Math.round(history.reduce((s, d) => s + d.analysis.overallRiskScore, 0) / history.length) : 0, color: 'text-amber-400' },
          { label: 'High Risk Docs', value: history.filter(d => (d.analysis.overallRiskScore >= 75)).length, color: 'text-red-400' },
          { label: 'Conflicts Found', value: history.reduce((s, d) => s + d.analysis.conflicts.length, 0), color: 'text-orange-400' },
        ].map(s => (
          <Card key={s.label} className="text-center">
            <CardContent className="pt-4 pb-4">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* History list */}
      <div className="space-y-3">
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-10">No past analyses found.</p>
        ) : (
          history.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
            >
              <Card onClick={() => handleSelect(doc.analysis)} className="hover:border-border/70 cursor-pointer transition-all hover:bg-card/80 group">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary/60 border border-border flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{doc.analysis.fileName}</p>
                        {doc.analysis.version && doc.analysis.version > 1 ? (
                          <span className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/25 px-2 py-0.5 rounded-full flex-shrink-0 font-bold">
                            v{doc.analysis.version} · AI Approved
                          </span>
                        ) : (
                          <span className="text-xs bg-secondary/70 px-2 py-0.5 rounded-full text-muted-foreground flex-shrink-0">
                            v1 · Original
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(doc.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-xs text-muted-foreground">{doc.analysis.language.nativeName}</span>
                        <span className="text-xs text-muted-foreground">{doc.analysis.clauses.length} clauses</span>
                        {(doc.analysis.rewritesApplied ?? 0) > 0 && (
                          <span className="text-xs text-violet-400">{doc.analysis.rewritesApplied} clause{doc.analysis.rewritesApplied! > 1 ? 's' : ''} rewritten</span>
                        )}
                        {doc.analysis.conflicts.length > 0 && (
                          <span className="text-xs text-amber-400">{doc.analysis.conflicts.length} conflict{doc.analysis.conflicts.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <Progress value={doc.analysis.overallRiskScore} colorClass={getRiskBarColor(doc.analysis.overallRiskScore)} className="h-1.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-lg font-bold">{doc.analysis.overallRiskScore}</span>
                        </div>
                        <RiskBadge level={doc.analysis.overallRiskScore >= 75 ? 'high' : doc.analysis.overallRiskScore >= 40 ? 'medium' : 'low'} size="sm" />
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
