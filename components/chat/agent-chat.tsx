'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  Trash2,
  Loader2,
  Bot,
  User,
  Database,
  Search,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Hexagon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { ConfirmDialog } from '@/components/confirm-dialog'
import ReactMarkdown from 'react-markdown'

// ================================================================
// Tipos
// ================================================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallResult[]
  timestamp: Date
}

interface ToolCallResult {
  tool: string
  input: Record<string, unknown>
  output: unknown
  success: boolean
  error?: string
}

// ================================================================
// Componente Principal
// ================================================================

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Ajusta altura do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          threadId,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao processar mensagem')
      }

      const data = await response.json()

      // Salvar thread ID para continuidade
      if (data.threadId) {
        setThreadId(data.threadId)
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        toolCalls: data.toolCalls,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Erro no chat:', error)
      toast.error('Erro ao processar mensagem. Tente novamente.')

      // Adicionar mensagem de erro
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setThreadId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'sql_query':
        return <Database className="h-3 w-3" />
      case 'vector_search':
        return <Search className="h-3 w-3" />
      case 'analyze_account':
      case 'get_financial_summary':
        return <BarChart3 className="h-3 w-3" />
      default:
        return <Bot className="h-3 w-3" />
    }
  }

  const getToolLabel = (tool: string) => {
    switch (tool) {
      case 'sql_query':
        return 'Consulta SQL'
      case 'vector_search':
        return 'Busca Semântica'
      case 'analyze_account':
        return 'Análise de Conta'
      case 'get_financial_summary':
        return 'Resumo Financeiro'
      default:
        return tool
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600">
              <Hexagon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Consultor QS Nexus</h2>
              <p className="text-sm text-muted-foreground">
                Análise inteligente de dados contábeis e fiscais
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" disabled={isLoading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Nova conversa
                </Button>
              }
              title="Iniciar nova conversa"
              description="Tem certeza que deseja limpar o histórico e iniciar uma nova conversa?"
              confirmText="Confirmar"
              cancelText="Cancelar"
              variant="destructive"
              onConfirm={handleClear}
            />
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-600/20 border border-emerald-500/30">
                    <Bot className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Olá! Sou o Consultor QS Nexus</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Posso ajudar você a analisar dados contábeis, buscar informações em documentos e
                  responder perguntas sobre seus dados fiscais.
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Database className="h-4 w-4 text-emerald-500" />
                    <span>Consultas SQL em dados normalizados</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Search className="h-4 w-4 text-cyan-500" />
                    <span>Busca semântica em documentos</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <span>Análise de contas e resumos financeiros</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className={cn('flex flex-col gap-2 max-w-[80%]', message.role === 'user' && 'items-end')}>
                  {/* Tool Calls */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {message.toolCalls.map((tc, idx) => (
                        <Badge
                          key={idx}
                          variant={tc.success ? 'secondary' : 'destructive'}
                          className="text-xs flex items-center gap-1"
                        >
                          {getToolIcon(tc.tool)}
                          {getToolLabel(tc.tool)}
                          {tc.success ? (
                            <CheckCircle2 className="h-3 w-3 ml-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Message Content */}
                  <Card
                    className={cn(
                      'p-4',
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-emerald-500 to-cyan-600 text-white border-0'
                        : 'bg-muted'
                    )}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {message.role === 'assistant' ? (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap break-words m-0">{message.content}</p>
                      )}
                    </div>
                  </Card>

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {message.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <Card className="bg-muted p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  <span className="text-sm text-muted-foreground">Analisando...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça uma pergunta sobre seus dados contábeis..."
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px] shrink-0 bg-gradient-to-br from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}

