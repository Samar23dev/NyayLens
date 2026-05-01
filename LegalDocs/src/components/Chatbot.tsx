import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, X, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'
import { useAnalysis } from '../lib/AnalysisContext'
import { getChatResponse, generateSmartSuggestedQuestions } from '../lib/chatUtils'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

export function Chatbot() {
  const { currentAnalysis } = useAnalysis()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  // Load messages when the analysis document changes
  useEffect(() => {
    const docId = currentAnalysis?.documentId || 'default'
    const saved = localStorage.getItem(`legal_chat_messages_${docId}`)
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
        return
      } catch (e) {
        console.error('Failed to parse saved messages')
      }
    }
    
    // Default greeting
    setMessages([
      {
        id: '1',
        text: 'Hello! I\'m your Legal AI Assistant. I can help you analyze clauses, identify risks, and answer questions about this contract. What would you like to know?',
        sender: 'bot',
        timestamp: new Date(),
      },
    ])
  }, [currentAnalysis?.documentId])

  // Save messages when they change
  useEffect(() => {
    const docId = currentAnalysis?.documentId || 'default'
    if (messages.length > 0) {
      localStorage.setItem(`legal_chat_messages_${docId}`, JSON.stringify(messages))
    }
  }, [messages, currentAnalysis?.documentId])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])

  // Generate smart suggested questions when analysis changes
  useEffect(() => {
    const questions = generateSmartSuggestedQuestions(currentAnalysis)
    setSuggestedQuestions(questions)
  }, [currentAnalysis])

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim()
    if (!messageText) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Get AI response with document context and history
      const chatHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }))
      const answer = await getChatResponse(messageText, currentAnalysis, chatHistory)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: answer,
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error getting chat response:', error)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error processing your question. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <MessageCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <Card className="h-full flex flex-col border-0">
              <CardHeader className="bg-gradient-to-r from-primary to-primary/80">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <MessageCircle size={20} />
                      Legal AI Assistant
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/70">Chat to analyze your contract</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 text-xs text-white font-medium">
                    <Sparkles size={12} />
                    Live
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 min-h-0 p-4">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {messages.length === 1 && inputValue === '' && messages[0].sender === 'bot' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 py-2">
                      <p className="text-xs text-muted-foreground font-medium px-1">Suggested questions:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestedQuestions.map((query, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            onClick={() => handleSendMessage(query)}
                            className="text-left p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-xs text-foreground/80 hover:text-foreground transition-all border border-primary/20 hover:border-primary/40"
                          >
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                              <span className="line-clamp-2">{query}</span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {messages.map((message, i) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn('flex gap-2', message.sender === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-xs px-3 py-2.5 rounded-lg text-sm break-words',
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-secondary text-foreground rounded-bl-none'
                        )}
                      >
                        <span className="whitespace-pre-wrap leading-relaxed">
                          {message.text.split(/(\*\*.*?\*\*)/g).map((part, idx) => 
                            part.startsWith('**') && part.endsWith('**') 
                              ? <strong key={idx} className="font-bold text-foreground/90">{part.slice(2, -2)}</strong>
                              : <span key={idx}>{part}</span>
                          )}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                      <div className="bg-secondary text-foreground px-3 py-2.5 rounded-lg rounded-bl-none flex items-center gap-2">
                        <span className="text-sm">Analyzing</span>
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.span
                              key={i}
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ delay: i * 0.15, repeat: Infinity, duration: 1.2 }}
                              className="block w-1.5 h-1.5 rounded-full bg-foreground/40"
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input Area */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                          handleSendMessage()
                        }
                      }}
                      placeholder="Ask a question..."
                      className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isLoading}
                    />
                    <Button
                      size="icon"
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim() || isLoading}
                      className="flex-shrink-0"
                    >
                      <Send size={16} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Press Enter to send</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
