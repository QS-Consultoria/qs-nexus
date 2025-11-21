import { NextRequest } from 'next/server'
import { processingEvents } from '@/lib/services/processing-events'
import { debugLog } from '@/lib/utils'

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  const jobId = params.jobId

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let isClosed = false

      const sendEvent = (type: string, data: any) => {
        if (isClosed) return
        const event = `data: ${JSON.stringify({ type, data })}\n\n`
        try {
          controller.enqueue(encoder.encode(event))
        } catch (error) {
          console.error('Error sending SSE event:', error)
        }
      }

      const closeStream = () => {
        if (isClosed) return
        isClosed = true
        try {
          processingEvents.off(jobId, listener)
          controller.close()
          debugLog(`[SSE Stream] Closed stream for job ${jobId}`)
        } catch (error) {
          console.error('Error closing stream:', error)
        }
      }

      // Listener para eventos de processamento
      const listener = (event: any) => {
        if (isClosed) return
        debugLog(`[SSE Stream] Received event for job ${jobId}:`, event.type, event.data)
        if (event.type === 'progress') {
          sendEvent('progress', event.data)
          debugLog(`[SSE Stream] Sent progress event for job ${jobId}`)
        } else if (event.type === 'job-complete') {
          sendEvent('job-complete', event.data)
          debugLog(`[SSE Stream] Sent job-complete event for job ${jobId}`)
          // Fecha o stream após conclusão
          setTimeout(() => {
            closeStream()
          }, 1000)
        } else if (event.type === 'job-error') {
          sendEvent('job-error', event.data)
          debugLog(`[SSE Stream] Sent job-error event for job ${jobId}`)
          // Fecha o stream após erro
          setTimeout(() => {
            closeStream()
          }, 1000)
        }
      }

      const streamStartTimestamp = new Date().toISOString()
      debugLog(`[SSE Stream] [${streamStartTimestamp}] Stream created for job ${jobId}`)
      
      // Obtém histórico de eventos antes de registrar o listener
      let history = processingEvents.getHistory(jobId)
      const initialHistorySize = history.length
      debugLog(`[SSE Stream] [${streamStartTimestamp}] Found ${initialHistorySize} events in history for job ${jobId}`)
      if (initialHistorySize > 0) {
        debugLog(`[SSE Stream] [${streamStartTimestamp}] History events:`, history.map(e => ({ type: e.type, timestamp: 'stored' })))
      }
      
      // Envia eventos históricos diretamente através do SSE (uma única vez)
      let hasJobComplete = false
      if (history.length > 0) {
        debugLog(`[SSE Stream] [${streamStartTimestamp}] Replaying ${history.length} historical events for job ${jobId}`)
        history.forEach((event, index) => {
          if (event.type === 'progress') {
            sendEvent('progress', event.data)
          } else if (event.type === 'job-complete') {
            sendEvent('job-complete', event.data)
            hasJobComplete = true
            debugLog(`[SSE Stream] [${streamStartTimestamp}] Found job-complete in history at index ${index}`)
          } else if (event.type === 'job-error') {
            sendEvent('job-error', event.data)
            hasJobComplete = true
            debugLog(`[SSE Stream] [${streamStartTimestamp}] Found job-error in history at index ${index}`)
          }
        })
        
        // Se o histórico já contém job-complete, fecha o stream após um delay
        if (hasJobComplete) {
          setTimeout(() => {
            closeStream()
          }, 1000)
        }
      }
      
      // Registra listener APENAS para novos eventos (não replay histórico)
      processingEvents.on(jobId, listener, false)
      const listenerRegistrationTimestamp = new Date().toISOString()
      debugLog(`[SSE Stream] [${listenerRegistrationTimestamp}] Listener registered for job ${jobId}`)

      // Verifica histórico novamente após um pequeno delay para capturar eventos que podem ter sido emitidos
      // durante a criação do stream (race condition)
      setTimeout(() => {
        if (isClosed) return
        
        const checkTimestamp = new Date().toISOString()
        const updatedHistory = processingEvents.getHistory(jobId)
        const isComplete = processingEvents.isJobComplete(jobId)
        
        debugLog(`[SSE Stream] [${checkTimestamp}] Checking history again after delay for job ${jobId}:`, {
          initialSize: initialHistorySize,
          currentSize: updatedHistory.length,
          isComplete,
          timeSinceStart: `${Date.now() - new Date(streamStartTimestamp).getTime()}ms`,
        })
        
        if (updatedHistory.length > history.length) {
          debugLog(`[SSE Stream] [${checkTimestamp}] Found ${updatedHistory.length - history.length} new events in history after delay for job ${jobId}`)
          
          // Envia apenas os novos eventos que não foram enviados antes
          const newEvents = updatedHistory.slice(history.length)
          newEvents.forEach((event, index) => {
            debugLog(`[SSE Stream] [${checkTimestamp}] Sending new event ${index + 1}/${newEvents.length}:`, event.type)
            if (event.type === 'progress') {
              sendEvent('progress', event.data)
            } else if (event.type === 'job-complete') {
              sendEvent('job-complete', event.data)
              hasJobComplete = true
              setTimeout(() => {
                closeStream()
              }, 1000)
            } else if (event.type === 'job-error') {
              sendEvent('job-error', event.data)
              hasJobComplete = true
              setTimeout(() => {
                closeStream()
              }, 1000)
            }
          })
        } else if (isComplete && !hasJobComplete) {
          // Se o job está completo mas não encontramos no histórico inicial, verifica novamente
          debugLog(`[SSE Stream] [${checkTimestamp}] Job is complete but not found in initial history, checking again...`)
          const completeEvent = updatedHistory.find(e => e.type === 'job-complete' || e.type === 'job-error')
          if (completeEvent) {
            debugLog(`[SSE Stream] [${checkTimestamp}] Found complete event on retry, sending:`, completeEvent.type)
            if (completeEvent.type === 'job-complete') {
              sendEvent('job-complete', completeEvent.data)
            } else {
              sendEvent('job-error', completeEvent.data)
            }
            hasJobComplete = true
            setTimeout(() => {
              closeStream()
            }, 1000)
          }
        }
      }, 200) // 200ms delay para capturar eventos emitidos durante a criação do stream
      
      // Retry adicional se job-complete ainda não foi encontrado após 500ms
      if (!hasJobComplete) {
        setTimeout(() => {
          if (isClosed || hasJobComplete) return
          
          const retryTimestamp = new Date().toISOString()
          const retryHistory = processingEvents.getHistory(jobId)
          const retryIsComplete = processingEvents.isJobComplete(jobId)
          
          debugLog(`[SSE Stream] [${retryTimestamp}] Retry check for job-complete for job ${jobId}:`, {
            historySize: retryHistory.length,
            isComplete: retryIsComplete,
            timeSinceStart: `${Date.now() - new Date(streamStartTimestamp).getTime()}ms`,
          })
          
          if (retryIsComplete && !hasJobComplete) {
            const completeEvent = retryHistory.find(e => e.type === 'job-complete' || e.type === 'job-error')
            if (completeEvent) {
              debugLog(`[SSE Stream] [${retryTimestamp}] Found complete event on retry, sending:`, completeEvent.type)
              if (completeEvent.type === 'job-complete') {
                sendEvent('job-complete', completeEvent.data)
              } else {
                sendEvent('job-error', completeEvent.data)
              }
              hasJobComplete = true
              setTimeout(() => {
                closeStream()
              }, 1000)
            }
          }
        }, 500) // 500ms retry adicional
      }

      // Envia evento inicial apenas se não houver histórico
      if (history.length === 0) {
        sendEvent('progress', {
          message: 'Processamento iniciado',
          jobId,
        })
      }

      // Cleanup quando o cliente desconectar
      request.signal.addEventListener('abort', () => {
        closeStream()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
