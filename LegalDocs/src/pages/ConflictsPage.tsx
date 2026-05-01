import { motion } from 'framer-motion'
import { AlertTriangle, AlertCircle, Info, Link2, ArrowLeftRight, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { ConflictPair, Clause } from '../types'
import { cn } from '../lib/utils'
import { useAnalysis } from '../lib/AnalysisContext'

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    label: 'Critical Conflict',
    className: 'border-red-500/40 bg-red-500/5',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    iconClass: 'text-red-400',
    dotClass: 'bg-red-500',
  },
  warning: {
    icon: AlertCircle,
    label: 'Warning',
    className: 'border-amber-500/40 bg-amber-500/5',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconClass: 'text-amber-400',
    dotClass: 'bg-amber-500',
  },
  info: {
    icon: Info,
    label: 'Advisory',
    className: 'border-blue-500/40 bg-blue-500/5',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    iconClass: 'text-blue-400',
    dotClass: 'bg-blue-500',
  },
}

function ConflictCard({ conflict, index, clauses }: { conflict: ConflictPair; index: number; clauses: Clause[] }) {
  const sev = SEVERITY_CONFIG[conflict.severity]
  const Icon = sev.icon

  const clauseA = clauses.find(c => c.id === conflict.clauseAId)
  const clauseB = clauses.find(c => c.id === conflict.clauseBId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={cn('border', sev.className)}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3 mb-4">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', sev.badgeClass, 'border')}>
              <Icon size={16} className={sev.iconClass} />
            </div>
            <div>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', sev.badgeClass)}>
                {sev.label}
              </span>
              <p className="text-sm font-semibold mt-2">
                "{conflict.clauseATitle}" contradicts "{conflict.clauseBTitle}"
              </p>
            </div>
          </div>

          {/* Clause pair visualization */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start my-4">
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Clause A</p>
              <p className="text-xs font-semibold">{conflict.clauseATitle}</p>
              {clauseA && (
                <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">{clauseA.text}</p>
              )}
            </div>

            <div className="flex flex-col items-center gap-1 pt-4">
              <div className="w-px h-4 bg-border" />
              <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center">
                <ArrowLeftRight size={12} className={sev.iconClass} />
              </div>
              <div className="w-px h-4 bg-border" />
            </div>

            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Clause B</p>
              <p className="text-xs font-semibold">{conflict.clauseBTitle}</p>
              {clauseB && (
                <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">{clauseB.text}</p>
              )}
            </div>
          </div>

          {/* Conflict description */}
          <div className="mt-3 p-3 rounded-lg bg-background/40 border border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">AI Analysis: </span>
              {conflict.description}
            </p>
          </div>

          {/* Recommended action */}
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
            <ChevronRight size={13} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Recommendation: </span>
              {conflict.severity === 'critical'
                ? 'Immediate legal review required. Request the Employer to align these clauses before signing. Do not execute this contract as-is.'
                : 'Seek written clarification from the Employer. Consider adding an addendum that resolves this ambiguity.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ConflictsPage() {
  const { currentAnalysis: data } = useAnalysis()

  if (!data) return <div className="p-6">Loading conflicts...</div>

  const hasCritical = data.conflicts.some(c => c.severity === 'critical')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Conflict Detector</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Internal clause contradictions detected by cross-reference analysis
        </p>
      </motion.div>

      {/* Alert banner */}
      {hasCritical && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-red-500/40 bg-red-500/8 p-4 flex items-start gap-3"
        >
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">Critical Conflicts Detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This document contains {data.conflicts.filter(c => c.severity === 'critical').length} critical conflict(s) that represent direct legal contradictions.
              Do not sign until all critical conflicts are resolved. Consult a qualified advocate.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3">
        {([
          { label: 'Critical', count: data.conflicts.filter(c => c.severity === 'critical').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Warnings', count: data.conflicts.filter(c => c.severity === 'warning').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Advisory', count: data.conflicts.filter(c => c.severity === 'info').length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        ] as const).map(s => (
          <div key={s.label} className={cn('rounded-xl border p-4 text-center', s.bg)}>
            <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Conflict visualization */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle>Clause Dependency Graph</CardTitle>
            <CardDescription>Conflicting clause pairs identified by cross-encoder analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Simple visual representation of conflicts */}
              <div className="grid grid-cols-3 gap-3">
                {data.clauses.slice(0, 9).map((clause, i) => {
                  const hasConflict = data.conflicts.some(
                    c => c.clauseAId === clause.id || c.clauseBId === clause.id,
                  )
                  const conflictSeverity = data.conflicts.find(
                    c => c.clauseAId === clause.id || c.clauseBId === clause.id,
                  )?.severity
                  return (
                    <div
                      key={clause.id}
                      className={cn(
                        'rounded-lg border p-2.5 text-center transition-all relative',
                        hasConflict && conflictSeverity === 'critical' ? 'border-red-500/50 bg-red-500/8' :
                          hasConflict && conflictSeverity === 'warning' ? 'border-amber-500/50 bg-amber-500/8' :
                            'border-border bg-secondary/30',
                      )}
                    >
                      {hasConflict && (
                        <div className={cn(
                          'absolute -top-1 -right-1 w-3 h-3 rounded-full',
                          conflictSeverity === 'critical' ? 'bg-red-500' : 'bg-amber-500',
                        )} />
                      )}
                      <p className="text-[10px] font-mono text-muted-foreground">§{clause.index + 1}</p>
                      <p className="text-xs font-medium mt-0.5 truncate">{clause.title}</p>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Critical conflict</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-muted-foreground">Warning</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Conflict cards */}
      <div className="space-y-4">
        {data.conflicts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Link2 size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No conflicts detected</p>
          </div>
        ) : (
          data.conflicts.map((conflict, i) => (
            <ConflictCard key={`${conflict.clauseAId}-${conflict.clauseBId}`} conflict={conflict} index={i} clauses={data.clauses} />
          ))
        )}
      </div>
    </div>
  )
}
