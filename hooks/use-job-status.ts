import { useEffect, useState, useCallback, useRef } from 'react'

export interface JobStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: string | null
  currentStep: string | null
  totalSteps: string | null
  error: string | null
  output: any
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface UseJobStatusOptions {
  onComplete?: (status: JobStatus) => void
  onError?: (error: string) => void
  onUpdate?: (status: JobStatus) => void
}

export function useJobStatus(jobId: string | null, options?: UseJobStatusOptions) {
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!jobId || eventSourceRef.current) return

    try {
      const eventSource = new EventSource(`/api/jobs/${jobId}/status`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as JobStatus
          setStatus(data)
          options?.onUpdate?.(data)

          // Se completou ou falhou, chamar callbacks e fechar conexão
          if (data.status === 'completed') {
            options?.onComplete?.(data)
            disconnect()
          } else if (data.status === 'failed') {
            options?.onError?.(data.error || 'Erro desconhecido')
            disconnect()
          }
        } catch (err) {
          console.error('Erro ao parsear mensagem SSE:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('Erro no EventSource:', err)
        setError('Erro na conexão de status')
        setIsConnected(false)
        disconnect()
      }
    } catch (err) {
      console.error('Erro ao criar EventSource:', err)
      setError('Erro ao conectar ao stream de status')
    }
  }, [jobId, options])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    status,
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  }
}

