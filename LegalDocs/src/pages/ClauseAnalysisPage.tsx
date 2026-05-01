import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import {
  AlertTriangle, ChevronDown, ChevronUp, Wand2, Scale, BookOpen,
  ExternalLink, Search, SlidersHorizontal, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { RiskBadge } from '../components/ui/RiskBadge'
import { Progress } from '../components/ui/Progress'
import { Clause } from '../types'
import { cn, getRiskColor, getRiskBarColor } from '../lib/utils'
import { useAnalysis } from '../lib/AnalysisContext'
import { api } from '../lib/api'

function ShapForcePlot({ tokens }: { tokens: Clause['shapTokens'] }) {
  const sorted = [...tokens].sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 8)
  const chartData = sorted.map(t => ({
    word: t.word.length > 14 ? t.word.slice(0, 14) + '…' : t.word,
    score: t.score,
  }))

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            domain={[-1, 1]}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.toFixed(1)}
          />
          <YAxis
            type="category"
            dataKey="word"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" />
          <Tooltip
            contentStyle={{ background: 'hsl(224 15% 10%)', border: '1px solid hsl(224 15% 18%)', borderRadius: 8, fontSize: 11 }}
            formatter={(v: number) => [v.toFixed(3), 'SHAP Value']}
          />
          <Bar dataKey="score" radius={3} barSize={14}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.score > 0 ? '#ef4444' : '#22c55e'} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ClauseCard({ clause }: { clause: Clause }) {
  const { updateClause } = useAnalysis()
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'shap' | 'rewrite' | 'precedents'>('shap')

  const [isRewriting, setIsRewriting] = useState(false)
  const [localRewrite, setLocalRewrite] = useState(clause.rewrite || '')

  const handleRewrite = async () => {
    if (isRewriting) return;
    setIsRewriting(true)
    try {
      const res = await api.rewriteClause(clause.text, "Legal Contract Context")
      setLocalRewrite(res.rewrite)
      updateClause(clause.id, { rewrite: res.rewrite })
    } catch (e) {
      setLocalRewrite("Failed to generate rewrite. Please try again.")
    } finally {
      setIsRewriting(false)
    }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn('border transition-all', expanded && 'border-primary/30')}>
        {/* Clause header - always visible */}
        <button
          className="w-full text-left"
          onClick={() => setExpanded(v => !v)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">§{clause.index + 1}</span>
                  <CardTitle className="text-sm">{clause.title}</CardTitle>
                  <span className="text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">{clause.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{clause.text}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className={cn('text-xl font-bold', getRiskColor(clause.riskLevel))}>{clause.riskScore}</p>
                  <p className="text-[10px] text-muted-foreground">/ 100</p>
                </div>
                <RiskBadge level={clause.riskLevel} size="sm" />
                {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </div>
            </div>
            <Progress value={clause.riskScore} colorClass={getRiskBarColor(clause.riskScore)} className="mt-3 h-1.5" />
          </CardHeader>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 border-t border-border">
                {/* Full text */}
                <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <BookOpen size={10} /> Full Clause Text
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{clause.text}</p>
                </div>

                {/* Tabs for XAI / rewrite / precedents */}
                <div className="mt-4">
                  <div className="flex gap-2 border-b border-border pb-0 mb-4">
                    {[
                      { key: 'shap', label: 'SHAP Analysis', icon: AlertTriangle },
                      { key: 'rewrite', label: 'AI Rewrite', icon: Wand2, disabled: false },
                      { key: 'precedents', label: 'Case Law', icon: Scale, disabled: !clause.retrievedPrecedents.length },
                    ].map(t => (
                      <button
                        key={t.key}
                        disabled={t.disabled}
                        onClick={() => setActiveTab(t.key as any)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-all',
                          activeTab === t.key
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                          t.disabled && 'opacity-40 cursor-not-allowed',
                        )}
                      >
                        <t.icon size={11} />
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'shap' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <p className="text-xs text-muted-foreground mb-3">
                        SHAP force plot — red bars push risk score up, green bars pull it down. Scores are additive contributions.
                      </p>
                      <ShapForcePlot tokens={clause.shapTokens} />
                      {/* Top flagged words */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {clause.shapTokens
                          .filter(t => t.score > 0.4)
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 6)
                          .map(t => (
                            <span key={t.word} className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-mono">
                              "{t.word}" +{t.score.toFixed(2)}
                            </span>
                          ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'rewrite' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="flex items-start gap-2 mb-3">
                        <Wand2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Safer alternative generated by Llama-3 via Groq API.
                        </p>
                      </div>
                      
                      {!localRewrite && !isRewriting ? (
                        <div className="text-center py-6 border border-dashed border-border rounded-lg bg-secondary/20">
                          <Wand2 size={24} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-sm text-muted-foreground mb-4">No rewrite generated yet for this clause.</p>
                          <Button size="sm" onClick={handleRewrite}>
                            Generate Safer Alternative
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-medium text-red-400 mb-1.5 uppercase tracking-wide">Original</p>
                              <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-xs text-foreground/70 leading-relaxed">
                                {clause.text}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-emerald-400 mb-1.5 uppercase tracking-wide">Safer Version</p>
                              <div className="p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/25 text-xs text-emerald-300/80 leading-relaxed relative min-h-[80px]">
                                {isRewriting ? (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                  </div>
                                ) : (
                                  localRewrite
                                )}
                              </div>
                            </div>
                          </div>
                          {!isRewriting && (
                            <div className="flex flex-col gap-3 mt-3">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(localRewrite)}>
                                  Copy Safer Version
                                </Button>
                                <Button size="sm" variant="secondary" onClick={handleRewrite}>
                                  Regenerate
                                </Button>
                              </div>
                              <p className="text-[10px] text-emerald-400/80 italic">
                                💡 Tip: Switch to the <strong>Document Viewer</strong> tab and click &quot;Show Safe Rewrites&quot; to see this change in context!
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'precedents' && clause.retrievedPrecedents.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      {clause.retrievedPrecedents.map(p => (
                        <div key={p.id} className="p-4 rounded-xl bg-secondary/30 border border-border">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{p.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{p.court} · {p.year}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex-shrink-0">
                              {(p.relevanceScore * 100).toFixed(0)}% match
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.summary}</p>
                          <div className="mt-2">
                            <Progress value={p.relevanceScore * 100} colorClass="bg-primary" className="h-1" />
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export function ClauseAnalysisPage() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'risk' | 'index'>('risk')
  const { currentAnalysis: data } = useAnalysis()

  if (!data) return <div className="p-6">Loading clauses...</div>

  const clauses = [...data.clauses]
    .filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'risk' ? b.riskScore - a.riskScore : a.index - b.index)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clause-by-Clause Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.clauses.length} clauses · SHAP explainability + AI rewrites + case law precedents
          </p>
        </div>
      </motion.div>

      {/* Search + sort toolbar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search clauses or categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-secondary/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSortBy(v => v === 'risk' ? 'index' : 'risk')}
        >
          <SlidersHorizontal size={13} />
          Sort: {sortBy === 'risk' ? 'By Risk' : 'By Order'}
        </Button>
      </motion.div>

      {/* Risk stats bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1 h-5">
              {(['high', 'medium', 'low', 'safe'] as const).map(level => {
                const count = data.clauses.filter(c => c.riskLevel === level).length
                const pct = (count / data.clauses.length) * 100
                const colors = {
                  high: 'bg-red-500',
                  medium: 'bg-amber-500',
                  low: 'bg-blue-400',
                  safe: 'bg-emerald-500',
                }
                return (
                  <div
                    key={level}
                    className={cn('h-full rounded-full', colors[level])}
                    style={{ width: `${pct}%`, opacity: 0.8 }}
                    title={`${level}: ${count} clauses`}
                  />
                )
              })}
            </div>
            <div className="flex items-center gap-5 mt-2">
              {(['high', 'medium', 'low', 'safe'] as const).map(level => {
                const count = data.clauses.filter(c => c.riskLevel === level).length
                const dotColors = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-400', safe: 'bg-emerald-500' }
                const labels = { high: 'High Risk', medium: 'Caution', low: 'Low Risk', safe: 'Safe' }
                return (
                  <div key={level} className="flex items-center gap-1.5">
                    <div className={cn('w-2 h-2 rounded-full', dotColors[level])} />
                    <span className="text-xs text-muted-foreground">{labels[level]}: {count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Clause cards */}
      <div className="space-y-3">
        {clauses.map((clause, i) => (
          <ClauseCard key={clause.id} clause={clause} />
        ))}
        {clauses.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Search size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No clauses match your search</p>
          </div>
        )}
      </div>
    </div>
  )
}
