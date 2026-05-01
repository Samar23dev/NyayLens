import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Loader2, Clock, Check } from 'lucide-react'
import { cn } from '../lib/utils'

interface AnalysisProgressProps {
  startTime: number
}

const ANALYSIS_STEPS = [
  { label: 'Extracting text from document', duration: 2000 },
  { label: 'Translating to English', duration: 1500 },
  { label: 'Segmenting clauses with spaCy', duration: 3000 },
  { label: 'Classifying with InLegalBERT', duration: 5000 },
  { label: 'Generating SHAP explanations', duration: 3000 },
  { label: 'Retrieving precedents from Chroma DB', duration: 2500 },
  { label: 'Matching regulations', duration: 2000 },
  { label: 'Detecting conflicts', duration: 2000 },
  { label: 'Finalizing analysis', duration: 1000 },
]

const TOTAL_DURATION = ANALYSIS_STEPS.reduce((sum, step) => sum + step.duration, 0)

export function AnalysisProgress({ startTime }: AnalysisProgressProps) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_DURATION / 1000)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / TOTAL_DURATION) * 100, 99)
      setProgress(newProgress)

      // Check if we've exceeded the expected duration
      if (elapsed >= TOTAL_DURATION) {
        setIsComplete(true)
        setProgress(99)
        setTimeRemaining(0)
        setCurrentStep(ANALYSIS_STEPS.length - 1)
        return
      }

      // Calculate current step
      let cumulativeDuration = 0
      let step = 0
      for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
        cumulativeDuration += ANALYSIS_STEPS[i].duration
        if (elapsed < cumulativeDuration) {
          step = i
          break
        }
      }
      setCurrentStep(Math.min(step, ANALYSIS_STEPS.length - 1))

      // Calculate time remaining
      const remaining = Math.max(0, (TOTAL_DURATION - elapsed) / 1000)
      setTimeRemaining(remaining)
    }, 100)

    return () => clearInterval(interval)
  }, [startTime])

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.ceil(seconds % 60)
    return `${mins}m ${secs}s`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-3"
    >
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full",
              isComplete 
                ? "bg-gradient-to-r from-emerald-500 to-green-500" 
                : "bg-gradient-to-r from-primary to-blue-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <Check size={10} className="text-white" />
                </motion.div>
                <span className="text-xs font-medium text-emerald-400">
                  Processing complete...
                </span>
              </>
            ) : (
              <>
                <Loader2 size={14} className="text-primary animate-spin" />
                <span className="text-xs font-medium text-foreground">
                  {Math.round(progress)}% Complete
                </span>
              </>
            )}
          </div>
          {!isComplete && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={12} />
              <span>{formatTime(timeRemaining)} remaining</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Step */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0",
            isComplete 
              ? "bg-emerald-500/15 border-emerald-500/30" 
              : "bg-primary/15 border-primary/25"
          )}>
            {isComplete ? (
              <Check size={16} className="text-emerald-400" />
            ) : (
              <span className="text-xs font-bold text-primary">{currentStep + 1}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isComplete ? 'Analysis complete! Redirecting...' : ANALYSIS_STEPS[currentStep]?.label}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isComplete ? 'Taking you to the dashboard' : `Step ${currentStep + 1} of ${ANALYSIS_STEPS.length}`}
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 mt-3">
          {ANALYSIS_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                isComplete
                  ? 'bg-emerald-500'
                  : index < currentStep
                  ? 'bg-primary'
                  : index === currentStep
                  ? 'bg-primary/50'
                  : 'bg-secondary'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Recent steps */}
      {!isComplete && (
        <div className="space-y-1">
          {ANALYSIS_STEPS.slice(Math.max(0, currentStep - 2), currentStep).map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <div className="w-1 h-1 rounded-full bg-emerald-400" />
              <span>✓ {step.label}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
