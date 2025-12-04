'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Clock, Code, Info } from 'lucide-react'
import { PIPELINE_STEPS, GLOSSARY, ERROR_SOLUTIONS } from '@/lib/constants/processing-tooltips'

interface StepDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stepId: number
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  metadata?: {
    wordsCount?: number
    chunksGenerated?: number
    tokensUsed?: number
    modelUsed?: string
    processingTime?: number
  }
}

export function StepDetailsModal({
  open,
  onOpenChange,
  stepId,
  status = 'pending',
  error,
  metadata,
}: StepDetailsModalProps) {
  const step = PIPELINE_STEPS.find(s => s.id === stepId)
  
  if (!step) return null

  const statusIcon = {
    pending: <Clock className="h-5 w-5 text-gray-400" />,
    processing: <Clock className="h-5 w-5 text-orange-500 animate-pulse" />,
    completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    failed: <AlertCircle className="h-5 w-5 text-red-500" />,
  }

  const statusColor = {
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    processing: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  }

  const getErrorSolution = () => {
    if (!error) return null
    
    for (const [key, solution] of Object.entries(ERROR_SOLUTIONS)) {
      if (error.includes(key)) {
        return solution
      }
    }
    return null
  }

  const errorSolution = getErrorSolution()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{step.icon}</span>
            <div>
              <DialogTitle className="text-2xl">{step.name}</DialogTitle>
              <DialogDescription>{step.description}</DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {statusIcon[status]}
            <Badge className={statusColor[status]}>
              {status === 'pending' && 'Pendente'}
              {status === 'processing' && 'Em Processamento'}
              {status === 'completed' && 'Concluído'}
              {status === 'failed' && 'Falhou'}
            </Badge>
            {step.usesAI && (
              <Badge variant="outline">Usa IA</Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="technical">Técnico</TabsTrigger>
            <TabsTrigger value="glossary">Glossário</TabsTrigger>
            {error && <TabsTrigger value="error">Erro</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">O que acontece nesta etapa?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{step.tooltip}</p>
                
                {step.estimatedTime && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Tempo estimado: {step.estimatedTime}</span>
                  </div>
                )}

                {metadata && (
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                    {metadata.wordsCount && (
                      <div>
                        <p className="text-xs text-muted-foreground">Palavras</p>
                        <p className="text-lg font-semibold">{metadata.wordsCount.toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                    {metadata.chunksGenerated && (
                      <div>
                        <p className="text-xs text-muted-foreground">Chunks</p>
                        <p className="text-lg font-semibold">{metadata.chunksGenerated}</p>
                      </div>
                    )}
                    {metadata.tokensUsed && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tokens</p>
                        <p className="text-lg font-semibold">{metadata.tokensUsed.toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                    {metadata.processingTime && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tempo</p>
                        <p className="text-lg font-semibold">{metadata.processingTime}s</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  <CardTitle className="text-lg">Detalhes Técnicos</CardTitle>
                </div>
                <CardDescription>Informações para desenvolvimento e debugging</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Implementação</h4>
                  <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded-lg">
                    {step.technicalDetails}
                  </p>
                </div>

                {metadata?.modelUsed && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Modelo de IA</h4>
                    <p className="text-sm text-muted-foreground">{metadata.modelUsed}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-sm mb-2">Etapa no Pipeline</h4>
                  <p className="text-sm text-muted-foreground">
                    Esta é a etapa {step.id} de {PIPELINE_STEPS.length - 1} do pipeline RAG.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="glossary" className="space-y-4 mt-4">
            <div className="grid gap-3">
              {Object.entries(GLOSSARY).map(([key, term]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-base">{term.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{term.description}</p>
                    {term.example && (
                      <div className="bg-muted p-2 rounded text-xs">
                        <span className="font-semibold">Exemplo:</span> {term.example}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {error && (
            <TabsContent value="error" className="space-y-4 mt-4">
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg text-red-800 dark:text-red-200">
                      {errorSolution?.title || 'Erro no Processamento'}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Mensagem de Erro</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 p-3 rounded-lg font-mono">
                      {error}
                    </p>
                  </div>

                  {errorSolution && (
                    <>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Explicação</h4>
                        <p className="text-sm text-muted-foreground">{errorSolution.explanation}</p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-1">
                              Como resolver
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {errorSolution.solution}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

