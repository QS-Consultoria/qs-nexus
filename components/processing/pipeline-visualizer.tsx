'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CheckCircle2, Circle, AlertCircle, Loader2, Info, ChevronRight } from 'lucide-react'
import { PIPELINE_STEPS, STATUS_EXPLANATIONS } from '@/lib/constants/processing-tooltips'
import { cn } from '@/lib/utils'

export interface PipelineStep {
  id: number
  key: string
  name: string
  icon: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  progress?: number
  message?: string
  error?: string
  startTime?: Date
  endTime?: Date
}

interface PipelineVisualizerProps {
  currentStep: number
  totalSteps: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
  error?: string
  onStepClick?: (stepId: number) => void
  compact?: boolean
  showTechnicalDetails?: boolean
}

export function PipelineVisualizer({
  currentStep,
  totalSteps,
  status,
  message,
  error,
  onStepClick,
  compact = false,
  showTechnicalDetails = false,
}: PipelineVisualizerProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  // Mapeia status do documento para status de cada etapa
  const getStepStatus = (stepId: number): PipelineStep['status'] => {
    if (status === 'failed' && stepId === currentStep) {
      return 'failed'
    }
    if (status === 'completed') {
      return 'completed'
    }
    if (stepId < currentStep) {
      return 'completed'
    }
    if (stepId === currentStep) {
      return 'processing'
    }
    return 'pending'
  }

  const getStepIcon = (stepStatus: PipelineStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Circle className="h-5 w-5 text-gray-300" />
    }
  }

  const getStepColor = (stepStatus: PipelineStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-950'
      case 'processing':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-950'
      case 'failed':
        return 'border-red-500 bg-red-50 dark:bg-red-950'
      default:
        return 'border-gray-200 dark:border-gray-800'
    }
  }

  const relevantSteps = PIPELINE_STEPS.slice(1, 8) // Remove "upload", começa do step 2

  if (compact) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {relevantSteps.map((step, index) => {
          const stepStatus = getStepStatus(step.id)
          const isActive = step.id === currentStep
          
          return (
            <div key={step.id} className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all',
                        getStepColor(stepStatus),
                        isActive && 'ring-2 ring-offset-2 ring-primary',
                        'cursor-help'
                      )}
                    >
                      <span className="text-lg">{step.icon}</span>
                      <span className="text-sm font-medium whitespace-nowrap">{step.name}</span>
                      {getStepIcon(stepStatus)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">{step.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{step.tooltip}</p>
                    {step.estimatedTime && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ⏱️ Tempo estimado: {step.estimatedTime}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {index < relevantSteps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barra de progresso geral */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso do Pipeline</span>
          <span className="text-muted-foreground">
            Etapa {currentStep} de {totalSteps}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-500',
              status === 'failed' ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-green-500'
            )}
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Mensagem atual */}
      {message && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Erro no Processamento</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Lista de etapas */}
      <div className="space-y-2">
        {relevantSteps.map((step, index) => {
          const stepStatus = getStepStatus(step.id)
          const isActive = step.id === currentStep
          const isExpanded = expandedStep === step.id
          
          return (
            <Card
              key={step.id}
              className={cn(
                'transition-all',
                getStepColor(stepStatus),
                isActive && 'ring-2 ring-primary'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Ícone da etapa */}
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(stepStatus)}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{step.icon}</span>
                        <h4 className="font-semibold">{step.name}</h4>
                        {step.usesAI && (
                          <Badge variant="secondary" className="text-xs">
                            IA
                          </Badge>
                        )}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver detalhes técnicos</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>

                    {/* Tempo estimado */}
                    {isActive && step.estimatedTime && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ⏱️ Tempo estimado: {step.estimatedTime}
                      </p>
                    )}

                    {/* Detalhes expandidos */}
                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 space-y-2">
                        <p className="text-sm">{step.tooltip}</p>
                        {showTechnicalDetails && (
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-mono text-muted-foreground">
                              {step.technicalDetails}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

