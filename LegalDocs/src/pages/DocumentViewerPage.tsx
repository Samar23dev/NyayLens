import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Wand2, BookOpen, Download, ExternalLink, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { RiskBadge } from '../components/ui/RiskBadge'
import { Progress } from '../components/ui/Progress'
import { Clause } from '../types'
import { cn, getRiskHeatColor, getRiskBarColor, getRiskColor } from '../lib/utils'
import { useAnalysis } from '../lib/AnalysisContext'
import { api } from '../lib/api'

function RiskScrollbar({ clauses }: { clauses: Clause[] }) {
  return (
    <div className="w-5 flex flex-col rounded-full overflow-hidden border border-border" style={{ minHeight: '100%' }}>
      {clauses.map(clause => (
        <div
          key={clause.id}
          title={`${clause.title}: ${clause.riskScore}`}
          className="flex-1 transition-all"
          style={{ background: getRiskHeatColor(clause.riskLevel) }}
        />
      ))}
    </div>
  )
}

function ShapInline({ tokens }: { tokens: Clause['shapTokens'] }) {
  return (
    <p className="text-sm leading-7 font-mono">
      {tokens.map((t, i) => {
        const intensity = Math.min(1, Math.abs(t.score))
        const isRisky = t.score > 0.3
        const isSafe = t.score < -0.15
        return (
          <span key={i}>
            <span
              className={cn(
                'rounded px-0.5 transition-all',
                isRisky && 'text-red-300',
                isSafe && 'text-emerald-300',
              )}
              style={{
                background: isRisky
                  ? `rgba(239,68,68,${intensity * 0.35})`
                  : isSafe
                    ? `rgba(34,197,94,${intensity * 0.25})`
                    : 'transparent',
              }}
              title={`SHAP: ${t.score.toFixed(2)}`}
            >
              {t.word}
            </span>
            {' '}
          </span>
        )
      })}
    </p>
  )
}


export function DocumentViewerPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'safe'>('all')
  const [showRewrites, setShowRewrites] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [approvedVersion, setApprovedVersion] = useState<number | null>(null)
  const { currentAnalysis: data, currentFileUrl, updateClause, setCurrentAnalysis, saveCurrentAnalysis } = useAnalysis()

  if (!data) return <div className="p-6">Loading document...</div>

  const selected = selectedId ? data.clauses.find(c => c.id === selectedId) || null : null

  const handleRewrite = async (clause: Clause) => {
    if (isRewriting) return;
    setIsRewriting(true)
    try {
      const res = await api.rewriteClause(clause.text, "Legal Contract Context")
      updateClause(clause.id, { rewrite: res.rewrite })
    } catch (e) {
      console.error("Failed to generate rewrite")
    } finally {
      setIsRewriting(false)
    }
  }

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      await api.exportDocument(data)
    } catch (e) {
      console.error('Export failed:', e)
      alert('Export failed. Make sure the backend is running and python-docx is installed.')
    } finally {
      setIsExporting(false)
    }
  }

  const rewriteCount = data.clauses.filter(c => c.rewrite).length

  const handleApprove = async () => {
    if (isApproving || rewriteCount === 0) return
    setIsApproving(true)
    try {
      const v2 = await api.approveDocument(data)
      setCurrentAnalysis(v2)
      saveCurrentAnalysis()
      setApprovedVersion(v2.version)
    } catch (e) {
      console.error('Approve failed:', e)
      alert('Approval failed. Make sure the backend is running.')
    } finally {
      setIsApproving(false)
    }
  }

  const filtered = filter === 'all' ? data.clauses : data.clauses.filter(c => c.riskLevel === filter)

  return (
    <div className="flex h-full">
      {/* Document pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/30">
          <h1 className="text-base font-semibold flex-1">Risk Heatmap</h1>
          <div className="flex items-center gap-3">
            {/* View Original PDF */}
            {currentFileUrl && (
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all"
              >
                <ExternalLink size={12} />
                View PDF
              </a>
            )}
            {/* Export with rewrites */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              title="Download a beautifully styled .docx legal report"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={12} className={isExporting ? 'animate-pulse' : ''} />
              {isExporting ? 'Generating…' : 'Export .docx'}
            </button>
            {/* Approve & Save as new version */}
            {rewriteCount > 0 && !approvedVersion && (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                title={`Approve ${rewriteCount} rewrite(s) and save as v${(data.version ?? 1) + 1}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-400 transition-all disabled:opacity-50 animate-pulse"
              >
                ✅ {isApproving ? 'Saving…' : `Approve & Save v${(data.version ?? 1) + 1}`}
              </button>
            )}
            {/* Success badge after approval */}
            {approvedVersion && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                ✅ Saved as v{approvedVersion}
              </span>
            )}
            {/* Version badge */}
            {data.version && data.version > 1 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500/15 border border-violet-500/25 text-violet-300">
                v{data.version} · {data.rewritesApplied} rewrites
              </span>
            )}
            <div className="h-4 w-px bg-border" />
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-emerald-400 hover:text-emerald-300">
              <input 
                type="checkbox" 
                checked={showRewrites} 
                onChange={(e) => setShowRewrites(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-secondary border-border focus:ring-emerald-500 focus:ring-offset-background"
              />
              Show Safe Rewrites
            </label>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1">
              {(['all', 'high', 'medium', 'low', 'safe'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                  filter === f
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                )}
              >
                {f === 'all' ? 'All' : f === 'high' ? '🔴 High' : f === 'medium' ? '🟡 Caution' : f === 'low' ? '🔵 Low' : '🟢 Safe'}
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Document content + scrollbar */}
        <div className="flex-1 overflow-y-auto flex gap-0">
          <div className="flex-1 px-8 py-6 space-y-3 overflow-y-scroll">
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-lg font-bold">{data.fileName.replace('.pdf', '')}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.clauses.length} clauses · Language: {data.language.name} · Translated to EN
                </p>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-3">
                  {[
                    { color: 'rgba(239,68,68,0.25)', label: 'High Risk' },
                    { color: 'rgba(245,158,11,0.20)', label: 'Caution' },
                    { color: 'rgba(96,165,250,0.15)', label: 'Low Risk' },
                    { color: 'rgba(34,197,94,0.10)', label: 'Safe' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color, border: '1px solid rgba(255,255,255,0.1)' }} />
                      <span className="text-xs text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {filtered.map((clause, i) => (
                  <motion.div
                    key={clause.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedId(clause.id)}
                    className={cn(
                      'rounded-xl p-4 border cursor-pointer transition-all duration-200 hover:scale-[1.005] hover:shadow-lg',
                      selected?.id === clause.id ? 'ring-2 ring-primary/50' : 'hover:border-border/80',
                    )}
                    style={{
                      background: getRiskHeatColor(clause.riskLevel),
                      borderColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">§{clause.index + 1}</span>
                        <span className="text-sm font-semibold">{clause.title}</span>
                        <span className="text-xs text-muted-foreground">· {clause.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-bold', getRiskColor(clause.riskLevel))}>
                          {clause.riskScore}
                        </span>
                        <RiskBadge level={clause.riskLevel} size="sm" />
                        <ChevronRight size={12} className="text-muted-foreground" />
                      </div>
                    </div>
                    {showRewrites && clause.rewrite ? (
                      <p className="text-xs text-emerald-300 leading-relaxed font-medium p-3 border border-dashed border-emerald-500/50 bg-emerald-500/10 rounded-md">
                        {clause.rewrite}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{clause.text}</p>
                    )}
                    <div className="mt-2.5">
                      <Progress value={clause.riskScore} colorClass={getRiskBarColor(clause.riskScore)} className="h-1" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Vertical risk scrollbar */}
          <div className="w-7 flex-shrink-0 py-6 pr-3 flex flex-col">
            <RiskScrollbar clauses={data.clauses} />
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[360px] flex-shrink-0 border-l border-border bg-card/80 flex flex-col overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold">{selected.title}</p>
                <p className="text-xs text-muted-foreground">{selected.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <RiskBadge level={selected.riskLevel} size="sm" />
                <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Risk score bar */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Risk Score</span>
                  <span className={cn('text-xl font-bold', getRiskColor(selected.riskLevel))}>{selected.riskScore}</span>
                </div>
                <Progress value={selected.riskScore} colorClass={getRiskBarColor(selected.riskScore)} />
              </div>

              {/* Full text */}
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BookOpen size={11} />
                  Original Text
                </p>
                <p className="text-xs text-foreground/80 leading-relaxed">{selected.text}</p>
              </div>

              {/* SHAP tokens */}
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={11} />
                  SHAP Word Attribution
                </p>
                <ShapInline tokens={selected.shapTokens} />
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-500/40" />
                    <span className="text-xs text-muted-foreground">Raises risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500/30" />
                    <span className="text-xs text-muted-foreground">Lowers risk</span>
                  </div>
                </div>
              </div>

              {/* Rewrite */}
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Wand2 size={11} className="text-emerald-400" />
                  AI-Suggested Safer Version
                </p>
                {selected.rewrite ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg p-3">
                      <p className="text-xs text-emerald-300/90 leading-relaxed">{selected.rewrite}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => navigator.clipboard.writeText(selected.rewrite!)}>
                        Copy
                      </Button>
                      <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => handleRewrite(selected)} disabled={isRewriting}>
                        {isRewriting ? 'Generating...' : 'Regenerate'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 border border-dashed border-border rounded-lg bg-secondary/20">
                    <Wand2 size={16} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                    <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => handleRewrite(selected)} disabled={isRewriting}>
                      {isRewriting ? 'Generating...' : 'Generate Safe Alternative'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Precedents */}
              {selected.retrievedPrecedents.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Relevant Case Law</p>
                  {selected.retrievedPrecedents.map(p => (
                    <div key={p.id} className="bg-secondary/40 border border-border rounded-lg p-3">
                      <p className="text-xs font-medium">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.court} · {p.year}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{p.summary}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="h-1 rounded-full bg-primary/30 flex-1">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${p.relevanceScore * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{(p.relevanceScore * 100).toFixed(0)}% match</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
