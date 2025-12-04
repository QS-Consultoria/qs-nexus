'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { STATUS_EXPLANATIONS } from '@/lib/constants/processing-tooltips'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, AlertCircle, XCircle, Ban } from 'lucide-react'

interface DocumentStatusBadgeProps {
  status: string
  currentStep?: number
  totalSteps?: number
  error?: string
  showTooltip?: boolean
  showIcon?: boolean
  processingTime?: number
}

export function DocumentStatusBadge({
  status,
  currentStep,
  totalSteps = 7,
  error,
  showTooltip = true,
  showIcon = true,
  processingTime,
}: DocumentStatusBadgeProps) {
  const getStatusInfo = () => {
    const baseInfo = STATUS_EXPLANATIONS[status as keyof typeof STATUS_EXPLANATIONS] || {
      label: status,
      description: 'Status desconhecido',
      color: 'gray',
      icon: '❓',
      action: '-',
    }

    let label = baseInfo.label
    let description = baseInfo.description

    // Customizar label e descrição baseado no estado
    if (status === 'processing' && currentStep && totalSteps) {
      label = `Processando - Etapa ${currentStep}/${totalSteps}`
      description = `Processamento em andamento. ${description}`
    }

    if (status === 'completed' && processingTime) {
      label = `Pronto ✓ (${processingTime}s)`
    }

    if (status === 'failed' && error) {
      description = `${description} Erro: ${error}`
    }

    return { ...baseInfo, label, description }
  }

  const statusInfo = getStatusInfo()

  const getStatusColor = () => {
    switch (statusInfo.color) {
      case 'green':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 border-green-200 dark:border-green-800'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
      case 'orange':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 border-orange-200 dark:border-orange-800'
      case 'red':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 border-red-200 dark:border-red-800'
      case 'gray':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200 border-gray-200 dark:border-gray-800'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200 border-gray-200 dark:border-gray-800'
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5" />
      case 'processing':
        return <Clock className="h-3.5 w-3.5 animate-pulse" />
      case 'pending':
        return <Clock className="h-3.5 w-3.5" />
      case 'failed':
        return <AlertCircle className="h-3.5 w-3.5" />
      case 'rejected':
        return <Ban className="h-3.5 w-3.5" />
      default:
        return <XCircle className="h-3.5 w-3.5" />
    }
  }

  const badgeContent = (
    <Badge className={cn('gap-1.5 font-medium border', getStatusColor())} variant="outline">
      {showIcon && getIcon()}
      <span>{statusInfo.label}</span>
    </Badge>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{statusInfo.icon}</span>
              <p className="font-semibold">{statusInfo.label}</p>
            </div>
            <p className="text-sm">{statusInfo.description}</p>
            {statusInfo.action && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                💡 {statusInfo.action}
              </p>
            )}
            {error && (
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">Erro:</p>
                <p className="text-xs text-red-600 dark:text-red-400 font-mono mt-1">{error}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

