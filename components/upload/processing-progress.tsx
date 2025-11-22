'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProcessStream } from '@/hooks/use-process-stream'
import { FileText, CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface ProcessingProgressProps {
  jobId: string | null
  onComplete?: () => void
}

const statusIcons = {
  pending: Clock,
  processing: Clock,
  completed: CheckCircle,
  failed: XCircle,
}

const statusColors = {
  pending: 'bg-yellow-500',
  processing: 'bg-orange-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou',
}

export function ProcessingProgress({ jobId, onComplete }: ProcessingProgressProps) {
  const { status, files, error, jobComplete } = useProcessStream(jobId)
  const prevJobCompleteRef = useRef(false)
  const notifiedFilesRef = useRef<Set<string>>(new Set())
  const [fileIds, setFileIds] = useState<Record<string, string>>({})
  const fetchedFileIdsRef = useRef<Set<string>>(new Set())

  // Notificar quando o job é concluído ou há erros
  useEffect(() => {
    if (jobComplete && !prevJobCompleteRef.current) {
      prevJobCompleteRef.current = true
      
      // Notifica o componente pai que o job foi concluído
      if (onComplete) {
        onComplete()
      }
      
      const fileArray = Object.values(files)
      const failedFiles = fileArray.filter((f: any) => f.status === 'failed')
      const completedFiles = fileArray.filter((f: any) => f.status === 'completed')
      const processingFiles = fileArray.filter((f: any) => f.status === 'processing' || f.status === 'pending')
      
      // Se há arquivos ainda em processamento quando o job completa, assume que foram concluídos com sucesso
      // (a menos que tenham falhado explicitamente)
      const totalProcessed = completedFiles.length + processingFiles.length
      
      if (failedFiles.length > 0) {
        if (failedFiles.length === fileArray.length) {
          // Todos os arquivos falharam
          toast.error(
            `Todos os arquivos foram rejeitados (${failedFiles.length} arquivo(s))`,
            { duration: 6000 }
          )
        } else {
          // Alguns arquivos falharam
          toast.error(
            `${failedFiles.length} arquivo(s) rejeitado(s) de ${fileArray.length} total`,
            { duration: 6000 }
          )
        }
      } else if (totalProcessed > 0) {
        // Todos os arquivos foram concluídos com sucesso (incluindo os que ainda estavam em processamento)
        toast.success(
          `Processamento concluído: ${totalProcessed} arquivo(s) processado(s) com sucesso`,
          { duration: 5000 }
        )
      }
    }
  }, [jobComplete, files, onComplete])

  // Notificar quando arquivos individuais falham
  useEffect(() => {
    const fileArray = Object.values(files)
    fileArray.forEach((file: any) => {
      if (file.status === 'failed' && !notifiedFilesRef.current.has(file.fileName)) {
        notifiedFilesRef.current.add(file.fileName)
        const errorMsg = file.error || file.message || 'Erro desconhecido'
        toast.error(
          `Arquivo rejeitado: ${file.fileName} - ${errorMsg}`,
          { duration: 8000 }
        )
      }
    })
  }, [files])

  // Buscar IDs dos arquivos quando são concluídos
  useEffect(() => {
    const fetchFileIds = async () => {
      const fileArray = Object.values(files)
      const completedFiles = fileArray.filter(
        (f: any) => f.status === 'completed' && !fetchedFileIdsRef.current.has(f.fileName)
      )
      
      if (completedFiles.length === 0) {
        return
      }
      
      for (const file of completedFiles) {
        fetchedFileIdsRef.current.add(file.fileName)
        
        try {
          // Buscar arquivo pelo fileName usando search
          const response = await fetch(`/api/documents?search=${encodeURIComponent(file.fileName)}&status=completed&limit=1`)
          if (response.ok) {
            const data = await response.json()
            if (data.files && data.files.length > 0) {
              // Pega o arquivo mais recente com esse nome
              const fileData = data.files[0]
              setFileIds(prev => ({
                ...prev,
                [file.fileName]: fileData.id
              }))
            }
          }
        } catch (error) {
          console.error(`Erro ao buscar ID do arquivo ${file.fileName}:`, error)
        }
      }
    }

    fetchFileIds()
  }, [files])

  if (!jobId || status === 'idle') {
    return null
  }

  const fileArray = Object.values(files)
  const totalProgress =
    fileArray.length > 0
      ? fileArray.reduce((acc: number, file: any) => acc + (file.progress || 0), 0) /
        fileArray.length
      : 0

  const failedCount = fileArray.filter((f: any) => f.status === 'failed').length
  const completedCount = fileArray.filter((f: any) => f.status === 'completed').length
  const processingCount = fileArray.filter((f: any) => f.status === 'processing').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {jobComplete
              ? failedCount > 0
                ? 'Processamento Concluído com Erros'
                : 'Processamento Concluído'
              : 'Processamento em Andamento'}
          </span>
          {jobComplete && (
            <Badge variant={failedCount > 0 ? 'destructive' : 'default'}>
              {failedCount > 0 ? `${failedCount} falha(s)` : 'Sucesso'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso Geral</span>
            <span>{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} />
          {fileArray.length > 0 && (
            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <span>✓ {completedCount} concluído(s)</span>
              {processingCount > 0 && <span>⏳ {processingCount} processando</span>}
              {failedCount > 0 && <span className="text-red-600">✗ {failedCount} rejeitado(s)</span>}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {fileArray.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aguardando início do processamento...</p>
          ) : (
            fileArray.map((file: any, index: number) => {
              const StatusIcon = statusIcons[file.status as keyof typeof statusIcons] || Clock
              const isFailed = file.status === 'failed'
              
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isFailed
                      ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <StatusIcon
                      className={`h-4 w-4 shrink-0 ${
                        isFailed
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isFailed ? 'text-red-900 dark:text-red-100' : ''}`}>
                        {file.fileName}
                      </p>
                      {file.message && (
                        <p className={`text-xs mt-1 ${
                          isFailed
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-muted-foreground'
                        }`}>
                          {file.message}
                        </p>
                      )}
                      {file.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {file.error}
                        </p>
                      )}
                      {file.currentStep && file.totalSteps && file.status !== 'failed' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Etapa {file.currentStep} de {file.totalSteps}
                        </p>
                      )}
                      {file.progress !== undefined && file.status !== 'failed' && (
                        <Progress value={file.progress} className="mt-2 h-1" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {file.status === 'completed' && fileIds[file.fileName] && (
                      <Link href={`/files/${fileIds[file.fileName]}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalhes</span>
                        </Button>
                      </Link>
                    )}
                    <Badge
                      className={`${
                        statusColors[file.status as keyof typeof statusColors] || 'bg-gray-500'
                      }`}
                      variant="default"
                    >
                      {statusLabels[file.status] || file.status}
                    </Badge>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
