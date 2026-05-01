import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Upload, FileText, Globe2, ChevronRight,
  Zap, ArrowRight, Check, ExternalLink, FlaskConical, Clock, Sun, Moon,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { SUPPORTED_LANGUAGES } from '../data/mockData'
import { Language } from '../types'
import { useAnalysis } from '../lib/AnalysisContext'
import { useTheme } from '../lib/ThemeContext'
import { StoredAnalysis } from '../lib/storageService'
import { AnalysisProgress } from '../components/AnalysisProgress'

// ─── Static Data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Shield,
    title: 'InLegalBERT Analysis',
    desc: 'AI model trained on 5.4M Indian cases classifies every clause as Safe, Caution, or High Risk',
  },
  {
    icon: Zap,
    title: 'SHAP Explainability',
    desc: 'Word-level analysis pinpoints the exact triggers of each risk score',
  },
  {
    icon: Globe2,
    title: '22 Indian Languages',
    desc: 'Native language support with translation for all official Indian languages',
  },
]

const SAMPLE_DOCS = [
  {
    name: 'SEBI Portfolio Manager Agreement',
    type: 'SEBI Regulatory',
    lang: 'English',
    risk: 'Medium',
    riskClass: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    url: 'https://www.sebi.gov.in/sebi_data/attachdocs/1441261015650.pdf',
  },
  {
    name: 'RBI Loan Agreement Template',
    type: 'Banking',
    lang: 'English',
    risk: 'Medium',
    riskClass: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    url: 'https://rbidocs.rbi.org.in/rdocs/Publications/PDFs/MCBLAF070712.pdf',
  },
  {
    name: 'MCA — Model Debenture Trust Deed',
    type: 'Corporate',
    lang: 'English',
    risk: 'Caution',
    riskClass: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    url: 'https://www.mca.gov.in/content/dam/mca/uploadedfiles/TRUST_DEED_MODEL_FORMAT.pdf',
  },
  {
    name: 'IndiaCode — Bhartiya Nyaya Sanhita 2023',
    type: 'Legislation',
    lang: 'English',
    risk: 'Reference',
    riskClass: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
    url: 'https://www.indiacode.nic.in/bitstream/123456789/20062/1/2023_45.pdf',
  },
]

const getRiskClass = (score: number) =>
  score >= 75
    ? 'text-red-400 bg-red-500/10 border-red-500/25'
    : score >= 40
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'

// ─── Component ───────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState<Language>(SUPPORTED_LANGUAGES[0])
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [history, setHistory] = useState<StoredAnalysis[]>([])
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null)

  const { analyzeDocument, isAnalyzing: analyzing, error, getHistory, setCurrentAnalysis } = useAnalysis()
  const { theme, toggleTheme } = useTheme()

  // Load history on mount — fixes stale closure bug from using getHistory() directly
  useEffect(() => {
    setHistory(getHistory().slice(0, 4))
  }, [getHistory])

  const handleHistorySelect = (analysis: any) => {
    setCurrentAnalysis(analysis)
    navigate('/dashboard')
  }

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  })

  const handleAnalyze = async () => {
    setAnalysisStartTime(Date.now())
    const success = await analyzeDocument(file, lang)
    if (success) navigate('/dashboard')
    setAnalysisStartTime(null)
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/3 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Shield size={18} className="text-primary" />
          </div>
          <div>
            <span className="text-base font-bold">NyayaLens</span>
            <span className="ml-2 text-xs text-muted-foreground font-mono">v2.1</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center transition-all"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun size={16} className="text-amber-400" />
            ) : (
              <Moon size={16} className="text-indigo-400" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Backend Online</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-14 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 text-xs text-primary font-medium mb-6">
            <Zap size={11} />
            AI-Powered Legal Risk Analysis
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Decode Every Clause,{' '}
            <span className="text-gradient">Before You Sign</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Upload any Indian legal contract in 22 languages. Get AI-powered risk scores,
            SHAP explanations, regulatory mapping to BNS &amp; SEBI, and safer clause rewrites.
          </p>
        </motion.div>

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full max-w-2xl space-y-4"
        >
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              'relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300',
              isDragActive
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : file
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-border hover:border-primary/50 hover:bg-primary/5',
            )}
          >
            <input {...getInputProps()} />
            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <FileText size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Remove &amp; choose another
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className={cn(
                    'w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors',
                    isDragActive ? 'bg-primary/20 border-primary/50' : 'bg-secondary border-border',
                  )}>
                    <Upload size={22} className={isDragActive ? 'text-primary' : 'text-muted-foreground'} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {isDragActive ? 'Drop your contract here' : 'Drop your contract or click to browse'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX · Scanned documents via OCR</p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Upload size={13} />
                    Browse Files
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Language Selector */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-border bg-card/60 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Globe2 size={15} className="text-primary" />
                      <span className="text-sm font-medium">Document Language</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Select the language of your contract</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowLangPicker(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base">{lang.nativeName}</span>
                        <span className="text-sm text-muted-foreground">— {lang.name}</span>
                      </span>
                      <ChevronRight
                        size={14}
                        className={cn('text-muted-foreground transition-transform', showLangPicker && 'rotate-90')}
                      />
                    </button>
                    <AnimatePresence>
                      {showLangPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute top-full mt-2 left-0 right-0 z-20 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-0.5 p-1.5 max-h-52 overflow-y-auto">
                            {SUPPORTED_LANGUAGES.map(l => (
                              <button
                                key={l.code}
                                onClick={() => { setLang(l); setShowLangPicker(false) }}
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-secondary',
                                  lang.code === l.code && 'bg-primary/15 text-primary',
                                )}
                              >
                                <span className="text-sm font-medium">{l.nativeName}</span>
                                <span className="text-xs text-muted-foreground">{l.name}</span>
                                {lang.code === l.code && <Check size={11} className="ml-auto text-primary" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyze Button */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  className="w-full h-12 text-base font-semibold glow-primary"
                  onClick={handleAnalyze}
                  loading={analyzing}
                >
                  {analyzing ? (
                    <span>Analyzing Contract...</span>
                  ) : (
                    <>
                      Analyze Contract
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>

                {/* Progress indicator */}
                {analyzing && analysisStartTime && (
                  <AnalysisProgress startTime={analysisStartTime} />
                )}

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm text-center font-medium"
                  >
                    {error}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Recent History OR Sample Documents */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="w-full max-w-2xl mt-8"
        >
          <div className="flex items-center gap-2 mb-3">
            {history.length > 0
              ? <Clock size={13} className="text-primary" />
              : <FlaskConical size={13} className="text-muted-foreground" />
            }
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {history.length > 0 ? `Recent Analyses (${history.length})` : 'Try with a sample document'}
            </p>
            <div className="flex-1 h-px bg-border" />
            {history.length > 0 && (
              <button
                onClick={() => navigate('/history')}
                className="text-[10px] text-primary hover:underline"
              >
                View all →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {history.length > 0 ? (
              history.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <button
                    onClick={() => handleHistorySelect(doc.analysis)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card/40 hover:bg-card/80 hover:border-primary/25 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{doc.analysis.fileName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(doc.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{doc.analysis.language.nativeName}</span>
                        {(doc.analysis.version ?? 1) > 1 && (
                          <span className="text-[10px] text-violet-400 font-bold">v{doc.analysis.version}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', getRiskClass(doc.analysis.overallRiskScore))}>
                        {doc.analysis.overallRiskScore}/100
                      </span>
                      <ArrowRight size={11} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </button>
                </motion.div>
              ))
            ) : (
              SAMPLE_DOCS.map((doc, i) => (
                <motion.div
                  key={doc.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card/40 hover:bg-card/80 hover:border-border/80 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{doc.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{doc.type}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{doc.lang}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', doc.riskClass)}>
                        {doc.risk}
                      </span>
                      <ExternalLink size={11} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </a>
                </motion.div>
              ))
            )}
          </div>

          {history.length === 0 && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              External links open the real government PDF in a new tab · Upload your own document to get started
            </p>
          )}
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass rounded-xl p-4 text-center"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-3">
                <f.icon size={16} className="text-primary" />
              </div>
              <p className="text-sm font-semibold mb-1">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          NyayaLens · Llama-3 × Legal-BERT × SHAP · Built for India's 22 official languages
        </p>
      </footer>
    </div>
  )
}
