import { motion } from 'framer-motion'
import { Scale, ExternalLink, BookOpen, ChevronRight, Filter } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Progress } from '../components/ui/Progress'
import { RiskBadge } from '../components/ui/RiskBadge'
import { cn } from '../lib/utils'
import { useAnalysis } from '../lib/AnalysisContext'

const BODY_COLORS: Record<string, string> = {
  BNS: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  SEBI: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  RBI: 'bg-green-500/15 text-green-400 border-green-500/30',
  'Companies Act': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'IT Act': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'Indian Contract Act': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Arbitration Act': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'Consumer Protection Act': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'Specific Relief Act': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'Limitation Act': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

const BODY_DESCRIPTIONS: Record<string, string> = {
  BNS: 'Bhartiya Nyaya Sanhita, 2023',
  SEBI: 'Securities and Exchange Board of India',
  RBI: 'Reserve Bank of India',
  'Companies Act': 'Indian Companies Act, 2013',
  'IT Act': 'Information Technology Act, 2000',
  'Indian Contract Act': 'Indian Contract Act, 1872',
  'Arbitration Act': 'Arbitration and Conciliation Act, 1996',
  'Consumer Protection Act': 'Consumer Protection Act, 2019',
  'Specific Relief Act': 'Specific Relief Act, 1963',
  'Limitation Act': 'Limitation Act, 1963',
}

function RegulationCard({ reg }: { reg: any }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <motion.div layout>
      <Card className="hover:border-border/70 transition-colors">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <Scale size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', BODY_COLORS[reg.body] || BODY_COLORS.BNS)}>
                      {reg.body}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{reg.code}</span>
                  </div>
                  <p className="text-sm font-semibold">{reg.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{BODY_DESCRIPTIONS[reg.body]}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs text-muted-foreground">Relevance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={reg.relevance * 100} colorClass="bg-primary" className="h-1.5 w-16" />
                    <span className="text-sm font-bold text-primary">{(reg.relevance * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">{reg.section}</span>
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    {showDetails ? 'Hide details' : 'View details'} <ChevronRight size={10} className={cn('transition-transform', showDetails && 'rotate-90')} />
                  </button>
                </div>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 pt-2 border-t border-border/50"
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This regulation applies to the referenced clause. For full legal text, consult the official India Code or regulatory body website.
                    </p>
                    <button 
                      onClick={() => alert("This would link to the official India Code or SEBI digital repository for the full regulatory text.")}
                      className="mt-2 text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      Open official source <ExternalLink size={10} />
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <BookOpen size={11} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Referenced in:</span>
                <span className="text-xs font-medium truncate">{reg.clauseTitle}</span>
                <RiskBadge level={reg.clauseRisk} size="sm" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const ALL_BODIES = ['BNS', 'SEBI', 'RBI', 'Companies Act', 'IT Act', 'Indian Contract Act', 'Arbitration Act', 'Consumer Protection Act', 'Specific Relief Act', 'Limitation Act'] as const

export function RegulationsPage() {
  const [bodyFilter, setBodyFilter] = useState<string>('All')
  const { currentAnalysis: data } = useAnalysis()

  if (!data) return <div className="p-6">Loading regulations...</div>

  const allRegulations = data.clauses.flatMap(clause =>
    clause.regulations.map(r => ({ ...r, clauseId: clause.id, clauseTitle: clause.title, clauseRisk: clause.riskLevel }))
  )

  const filtered = bodyFilter === 'All'
    ? allRegulations
    : allRegulations.filter(r => r.body === bodyFilter)

  const bodyCounts = Object.fromEntries(
    ALL_BODIES.map(b => [
      b, allRegulations.filter(r => r.body === b).length,
    ])
  )

  // Only show bodies that have at least one regulation
  const activeBodies = ALL_BODIES.filter(b => (bodyCounts[b] ?? 0) > 0)

  const totalRegulations = allRegulations.length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Regulatory Mapping</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalRegulations > 0 
            ? `${totalRegulations} regulation${totalRegulations !== 1 ? 's' : ''} mapped across Indian legal bodies`
            : 'Clause-level mapping to Indian legal regulatory bodies'
          }
        </p>
      </motion.div>

      {totalRegulations === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-secondary/40 border border-border flex items-center justify-center mx-auto mb-4">
            <Scale size={32} className="text-muted-foreground opacity-40" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Regulations Matched</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The backend didn't find any matching regulations for this document. 
            This could mean the clauses don't contain keywords related to Indian legal regulations, 
            or the regulations database needs more keywords.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Summary cards */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {activeBodies.map(body => (
              <div
                key={body}
                onClick={() => setBodyFilter(body === bodyFilter ? 'All' : body)}
                className={cn(
                  'rounded-xl border p-3 text-center cursor-pointer transition-all',
                  bodyFilter === body ? 'border-primary/50 bg-primary/10' : 'border-border bg-card/60 hover:bg-secondary/40',
                )}
              >
                <p className="text-xs font-mono text-muted-foreground">{body}</p>
                <p className="text-xl font-bold mt-1">{bodyCounts[body]}</p>
                <p className="text-[10px] text-muted-foreground">references</p>
              </div>
            ))}
          </motion.div>

          {/* Filter bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-muted-foreground" />
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setBodyFilter('All')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  bodyFilter === 'All' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                )}
              >
                All
              </button>
              {activeBodies.map(b => (
                <button
                  key={b}
                  onClick={() => setBodyFilter(b)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    bodyFilter === b ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                  )}
                >
                  {b} ({bodyCounts[b]})
                </button>
              ))}
            </div>
          </motion.div>

          {/* Regulation cards */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Scale size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No regulations found for "{bodyFilter}" filter</p>
                <button 
                  onClick={() => setBodyFilter('All')}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              filtered.map((reg, i) => (
                <motion.div key={reg.id + reg.clauseId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <RegulationCard reg={reg} />
                </motion.div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
