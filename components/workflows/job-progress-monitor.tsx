'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useJobStatus, JobStatus } from '@/hooks/use-job-status'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface JobProgressMonitorProps {
  jobId: string
  onComplete?: (status: JobStatus) => void
  onError?: (error: string) => void
}

export function JobProgressMonitor({
  jobId,
  onComplete,
  onError,
}: JobProgressMonitorProps) {
  const { status, isConnected, error } = useJobStatus(jobId, {
    onComplete,
    onError,
  })

  if (!status) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = () => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline',
      cancelled: 'outline',
    }
    return variants[status.status] || 'outline'
  }

  const getStatusText = () => {
    switch (status.status) {
      case 'completed':
        return 'Concluído'
      case 'failed':
        return 'Falhou'
      case 'running':
        return 'Executando'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status.status
    }
  }

  const progressValue = status.progress ? parseInt(status.progress) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Status da Execução</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadge()}>{getStatusText()}</Badge>
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                Conectado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Current Step */}
        {status.currentStep && status.totalSteps && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Etapa</span>
            <span className="font-medium">
              {status.currentStep} de {status.totalSteps}
            </span>
          </div>
        )}

        {/* Timing */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block mb-1">Iniciado</span>
            <span className="font-medium">
              {status.startedAt
                ? formatDistanceToNow(new Date(status.startedAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : 'Aguardando'}
            </span>
          </div>
          {status.completedAt && (
            <div>
              <span className="text-muted-foreground block mb-1">Concluído</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(status.completedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {status.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        )}

        {/* Output */}
        {status.output && status.status === 'completed' && (
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Resultado</span>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48">
              {JSON.stringify(status.output, null, 2)}
            </pre>
          </div>
        )}

        {/* Connection Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

