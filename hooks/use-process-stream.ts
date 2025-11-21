'use client'

import { useEffect, useState, useRef } from 'react'

interface ProcessEvent {
  type: 'progress' | 'job-complete' | 'job-error'
  data: {
    fileName?: string
    status?: string
    currentStep?: number
    totalSteps?: number
    progress?: number
    message?: string
    error?: string
    jobId?: string
  }
}

export function useProcessStream(jobId: string | null) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'completed'>('idle')
  const [progress, setProgress] = useState(0)
  const [files, setFiles] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)
  const [jobComplete, setJobComplete] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const isClosingRef = useRef(false)

  useEffect(() => {
    if (!jobId) {
      return
    }

    // Se já está completo, não reconecta
    if (jobComplete) {
      return
    }

    setStatus('connecting')
    setJobComplete(false)
    setError(null)
    isClosingRef.current = false
    const eventSource = new EventSource(`/api/process/${jobId}/stream`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      if (!isClosingRef.current) {
        setStatus('connected')
      }
    }

    eventSource.onmessage = event => {
      try {
        const processEvent: ProcessEvent = JSON.parse(event.data)

        switch (processEvent.type) {
          case 'progress':
            if (processEvent.data.fileName) {
              const fileName = processEvent.data.fileName
              setFiles(prev => {
                const updated = {
                  ...prev,
                  [fileName]: {
                    fileName: fileName,
                    status: processEvent.data.status || 'processing',
                    progress: processEvent.data.progress || 0,
                    currentStep: processEvent.data.currentStep,
                    totalSteps: processEvent.data.totalSteps,
                    message: processEvent.data.message,
                    error: processEvent.data.error,
                  },
                }
                // Atualiza progresso geral (média de todos os arquivos)
                const allFiles = Object.values(updated)
                const avgProgress =
                  allFiles.length > 0
                    ? allFiles.reduce((acc: number, f: any) => acc + (f.progress || 0), 0) /
                      allFiles.length
                    : 0
                setProgress(avgProgress)
                return updated
              })
            }
            break
          case 'job-complete':
            isClosingRef.current = true
            setStatus('completed')
            setJobComplete(true)
            if (processEvent.data.error) {
              setError(processEvent.data.error)
            }
            // Atualiza arquivos que ainda estão em processamento para completed
            setFiles(prev => {
              const updated = { ...prev }
              Object.keys(updated).forEach(fileName => {
                if (updated[fileName].status === 'processing' || updated[fileName].status === 'pending') {
                  updated[fileName] = {
                    ...updated[fileName],
                    status: 'completed',
                    progress: 100,
                  }
                }
              })
              return updated
            })
            // Fecha imediatamente para evitar reconexão
            eventSource.close()
            eventSourceRef.current = null
            break
          case 'job-error':
            isClosingRef.current = true
            setStatus('error')
            setJobComplete(true)
            if (processEvent.data.error) {
              setError(processEvent.data.error)
            }
            // Fecha imediatamente para evitar reconexão
            eventSource.close()
            eventSourceRef.current = null
            break
        }
      } catch (err) {
        console.error('[SSE] Error parsing SSE event:', err, 'Raw data:', event.data)
      }
    }

    eventSource.onerror = (err) => {
      // Se já está fechando ou completo, ignora o erro
      if (isClosingRef.current || jobComplete) {
        return
      }
      
      // Verifica se o EventSource está realmente em erro ou apenas fechado
      if (eventSource.readyState === EventSource.CLOSED) {
        // Conexão foi fechada pelo servidor (normal após job-complete)
        if (!jobComplete) {
          setStatus('error')
          setError('Conexão perdida com o servidor')
        }
        isClosingRef.current = true
        eventSource.close()
        eventSourceRef.current = null
      }
    }

    return () => {
      if (eventSourceRef.current) {
        isClosingRef.current = true
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [jobId]) // Removido jobComplete das dependências para evitar reconexão

  return { status, progress, files, error, jobComplete }
}
