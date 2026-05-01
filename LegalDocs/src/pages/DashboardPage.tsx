import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, CheckCircle2, AlertCircle, FileText, Clock, Zap, ArrowRight, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { RiskBadge } from '../components/ui/RiskBadge'
import { cn, formatDate, getRiskBarColor } from '../lib/utils'
import { Progress } from '../components/ui/Progress'
import { Badge } from '../components/ui/misc'
import { useAnalysis } from '../lib/AnalysisContext'
import { storageService } from '../lib/storageService'
import { useTheme } from '../lib/ThemeContext'

const PIE_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#60a5fa',
  safe: '#22c55e',
}

function RiskGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 80
  const offset = circumference - (score / 100) * circumference * 0.75
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e'
  const label = score >= 70 ? 'HIGH RISK' : score >= 40 ? 'CAUTION' : 'SAFE'

  return (
    <div className="relative w-52 h-52 mx-auto">
      <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${circumference * 0.75} ${circumference}`} />
        <circle
          cx="100" cy="100" r="80" fill="none"
          stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)`, transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground mt-0.5">/100</span>
        <span className="text-xs font-semibold mt-2" style={{ color }}>{label}</span>
      </div>
    </div>
  )
}

const StatItem = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="flex items-center gap-3">
    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color || 'bg-secondary')}>
      <Icon size={16} className="text-foreground/70" />
    </div>
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  </div>
)

export function DashboardPage() {
  const navigate = useNavigate()
  const { currentAnalysis: data } = useAnalysis()
  const { theme } = useTheme()
  const [trendData, setTrendData] = useState<Array<{ date: string; avgRiskScore: number }>>([])

  useEffect(() => {
    // Get trend data from storage for the last 7 days
    const trends = storageService.getTrendData(7)
    setTrendData(trends)
  }, [])

  if (!data) return <div className="p-6">Loading analysis...</div>

  // Theme-aware tooltip styles
  const tooltipStyle = {
    background: theme === 'dark' ? 'hsl(224 15% 10%)' : 'hsl(0 0% 100%)',
    border: theme === 'dark' ? '1px solid hsl(224 15% 18%)' : '1px solid hsl(214 32% 91%)',
    borderRadius: 8,
    color: theme === 'dark' ? 'hsl(213 31% 91%)' : 'hsl(222 47% 11%)',
  }

  const tooltipLabelStyle = {
    color: theme === 'dark' ? 'white' : 'hsl(222 47% 11%)',
  }

  const topClauses = [...data.clauses].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5)

  const pieData = [
    { name: 'High Risk', value: data.riskBreakdown.high, fill: PIE_COLORS.high },
    { name: 'Caution', value: data.riskBreakdown.medium, fill: PIE_COLORS.medium },
    { name: 'Low Risk', value: data.riskBreakdown.low, fill: PIE_COLORS.low },
    { name: 'Safe', value: data.riskBreakdown.safe, fill: PIE_COLORS.safe },
  ]

  const categoryCount: Record<string, number> = {}
  data.clauses.forEach(c => {
    categoryCount[c.category] = (categoryCount[c.category] || 0) + 1
  })
  const dynamicCategoryDist = Object.entries(categoryCount).map(([k, v]) => ({ category: k, count: v }))

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Risk Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <FileText size={12} className="inline mr-1" />
            {data.fileName} · Analyzed {formatDate(data.uploadedAt)} · {data.processingTime}s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/')}>
            <FileText size={13} /> New Document
          </Button>
          <Button size="sm" onClick={() => navigate('/document')}>
            View Heatmap <ArrowRight size={13} />
          </Button>
        </div>
      </motion.div>

      {/* Top row: Gauge + breakdown + summary */}
      <div className="grid grid-cols-12 gap-4">
        {/* Gauge */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }} className="col-span-12 md:col-span-4">
          <Card variant="bordered" className="h-full">
            <CardHeader>
              <CardTitle>Overall Risk Score</CardTitle>
              <CardDescription>Weighted composite (ML + RAG)</CardDescription>
            </CardHeader>
            <CardContent>
              <RiskGauge score={data.overallRiskScore} />
              <div className="mt-6 grid grid-cols-2 gap-3">
                {pieData.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill }} />
                    <span className="text-xs text-muted-foreground">{p.name}</span>
                    <span className="text-xs font-bold ml-auto">{p.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary + Pie */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="col-span-12 md:col-span-5">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>AI Summary</CardTitle>
              <CardDescription>Generated by Legal-BERT + GPT-4</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default">{data.clauses.length} Clauses</Badge>
                <Badge variant="secondary">{data.conflicts.length} Conflicts</Badge>
                <Badge variant="secondary">{data.language.name} → English</Badge>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat cards */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="col-span-12 md:col-span-3 flex flex-col gap-4">
          <Card className="flex-1">
            <CardContent className="pt-5 space-y-5">
              <StatItem icon={AlertTriangle} label="High Risk Clauses" value={data.riskBreakdown.high} color="bg-red-500/15" />
              <StatItem icon={AlertCircle} label="Caution Clauses" value={data.riskBreakdown.medium} color="bg-amber-500/15" />
              <StatItem icon={CheckCircle2} label="Safe Clauses" value={data.riskBreakdown.safe + data.riskBreakdown.low} color="bg-emerald-500/15" />
              <StatItem icon={Zap} label="Conflicts Detected" value={data.conflicts.length} color="bg-purple-500/15" />
              <StatItem icon={Clock} label="Processing Time" value={`${data.processingTime}s`} color="bg-blue-500/15" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second row: risk trend + category dist */}
      <div className="grid grid-cols-12 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-12 md:col-span-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Risk Score Trend</CardTitle>
                  <CardDescription>Monthly avg across analysed docs</CardDescription>
                </div>
                <TrendingUp size={16} className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData.length > 0 ? trendData : [{ date: 'No data', avgRiskScore: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Line type="monotone" dataKey="avgRiskScore" stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: '#a78bfa', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="col-span-12 md:col-span-6">
          <Card>
            <CardHeader>
              <CardTitle>Clauses by Category</CardTitle>
              <CardDescription>Distribution across contract sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicCategoryDist} layout="vertical" barSize={9}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={96} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Bar dataKey="count" radius={4} fill="#7c3aed" fillOpacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Third row: top risky clauses table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Risk Clauses</CardTitle>
                <CardDescription>Sorted by risk score descending</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/clauses')}>
                View All <ArrowRight size={13} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClauses.map((clause, i) => (
                <motion.div
                  key={clause.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/clauses')}
                >
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{clause.title}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">· {clause.category}</span>
                    </div>
                    <Progress
                      value={clause.riskScore}
                      colorClass={getRiskBarColor(clause.riskScore)}
                      className="h-1.5"
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold w-8 text-right">{clause.riskScore}</span>
                    <RiskBadge level={clause.riskLevel} size="sm" />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
