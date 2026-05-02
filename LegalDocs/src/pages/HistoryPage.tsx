import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Clock, ChevronRight, Trash2, AlertTriangle, Search, Sparkles, X, Loader2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { RiskBadge } from '../components/ui/RiskBadge'
import { Progress } from '../components/ui/Progress'
import { Button } from '../components/ui/Button'
import { cn, getRiskBarColor } from '../lib/utils'
import { useAnalysis } from '../lib/AnalysisContext'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo, useRef } from 'react'
import { api } from '../lib/api'
import { StoredAnalysis } from '../lib/storageService'

type SearchResult = {
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
}

export function HistoryPage() {
  const { getHistory, setCurrentAnalysis, clearHistory } = useAnalysis()
  const navigate = useNavigate()
  const [history, setHistory] = useState<StoredAnalysis[]>(getHistory())
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Search state ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [semanticResults, setSemanticResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<'local' | 'semantic'>('local')
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Local (instant) search over localStorage history ─────────────────────
  const localFiltered = useMemo<StoredAnalysis[]>(() => {
    if (!query.trim() || searchMode === 'semantic') return history
    const q = query.toLowerCase()
    return history.filter(doc =>
      doc.analysis.fileName.toLowerCase().includes(q) ||
      doc.analysis.summary?.toLowerCase().includes(q) ||
      doc.analysis.clauses.some(c =>
        c.text.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      )
    )
  }, [query, history, searchMode])

  // ── Semantic search via backend ───────────────────────────────────────────
  const handleSemanticSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setSemanticResults(null)
    try {
      const res = await api.searchDocuments(query, 10)
      setSemanticResults(res.results)
    } catch (e: any) {
      setSearchError(e.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setSemanticResults(null)
    setSearchError(null)
    inputRef.current?.focus()
  }

  const handleSelect = (analysis: any) => {
    setCurrentAnalysis(analysis)
    navigate('/dashboard')
  }

  const handleClearHistory = () => {
    clearHistory()
    setHistory([])
    setShowConfirm(false)
  }

  // ── Decide which list to render ───────────────────────────────────────────
  const showingSemantic = searchMode === 'semantic' && semanticResults !== null
  const displayList = showingSemantic ? null : localFiltered   // semantic has its own renderer

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analysis History</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {history.length} document{history.length !== 1 ? 's' : ''} analysed · Powered by NyayaLens
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

      {/* Search Bar */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          {/* Mode tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSearchMode('local'); setSemanticResults(null) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                searchMode === 'local'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Search size={12} /> Instant Search
            </button>
            <button
              onClick={() => setSearchMode('semantic')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                searchMode === 'semantic'
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Sparkles size={12} /> Semantic Search
            </button>
            {searchMode === 'semantic' && (
              <span className="text-[10px] text-muted-foreground ml-1">
                · AI vector search via ChromaDB — works on all uploaded documents
              </span>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); if (searchMode === 'local') setSemanticResults(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && searchMode === 'semantic') handleSemanticSearch() }}
                placeholder={
                  searchMode === 'local'
                    ? 'Filter by filename, clause text, category…'
                    : 'e.g. "termination without notice" or "unlimited indemnification"'
                }
                className="w-full bg-background border border-border rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              {query && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            {searchMode === 'semantic' && (
              <Button
                onClick={handleSemanticSearch}
                disabled={searching || !query.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                size="sm"
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {searching ? 'Searching…' : 'Search'}
              </Button>
            )}
          </div>

          {/* Error */}
          {searchError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={12} /> {searchError}
            </p>
          )}
        </div>
      </motion.div>

      {/* Clear History confirm */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
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
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleClearHistory}>
                  <Trash2 size={14} /> Clear All
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aggregate stats (hide during semantic search results) */}
      {!showingSemantic && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Documents', value: history.length, color: 'text-primary' },
            { label: 'Avg Risk Score', value: history.length > 0 ? Math.round(history.reduce((s, d) => s + d.analysis.overallRiskScore, 0) / history.length) : 0, color: 'text-amber-400' },
            { label: 'High Risk Docs', value: history.filter(d => d.analysis.overallRiskScore >= 75).length, color: 'text-red-400' },
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
      )}

      {/* ── Semantic search results ── */}
      {showingSemantic && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{semanticResults!.length}</span> result{semanticResults!.length !== 1 ? 's' : ''} for "{query}"
          </p>
          {semanticResults!.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">No matching documents found. Try a different query.</p>
          ) : (
            semanticResults!.map((result, i) => (
              <motion.div key={result.documentId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="hover:border-violet-500/40 cursor-pointer transition-all hover:bg-card/80 group"
                  onClick={() => {
                    // Find in localStorage history and load if available
                    const local = history.find(h => h.analysis.documentId === result.documentId)
                    if (local) handleSelect(local.analysis)
                  }}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={16} className="text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{result.fileName}</p>
                          <span className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/25 px-2 py-0.5 rounded-full flex-shrink-0">
                            {Math.round(result.relevanceScore * 100)}% match
                          </span>
                        </div>
                        {/* Matched clause */}
                        {result.matchedClauseTitle && (
                          <p className="text-xs text-violet-400 mt-1 font-medium">
                            Matched: {result.matchedClauseTitle}
                          </p>
                        )}
                        {/* Snippet */}
                        {result.matchedSnippet && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                            "{result.matchedSnippet}"
                          </p>
                        )}
                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(result.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs text-muted-foreground">{result.language.nativeName}</span>
                          <span className="text-xs text-muted-foreground">{result.clauseCount} clauses</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-lg font-bold">{result.overallRiskScore}</span>
                          <RiskBadge level={result.overallRiskScore >= 70 ? 'high' : result.overallRiskScore >= 40 ? 'medium' : 'safe'} size="sm" />
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* ── Local history list ── */}
      {!showingSemantic && (
        <div className="space-y-3">
          {displayList!.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">
              {query ? `No documents match "${query}"` : 'No past analyses found.'}
            </p>
          ) : (
            displayList!.map((doc, i) => (
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
                            <span className="text-xs text-violet-400">{doc.analysis.rewritesApplied} rewritten</span>
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
                          <span className="text-lg font-bold">{doc.analysis.overallRiskScore}</span>
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
      )}
    </div>
  )
}
