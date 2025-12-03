import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { getExecutionById } from '@/lib/services/workflow-service'

/**
 * GET /api/jobs/[id]/status
 * Server-Sent Events para acompanhar status de execução
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verificar autenticação
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult

  try {
    // Verificar se o job existe e se o usuário tem acesso
    const execution = await getExecutionById(params.id)

    if (!execution) {
      return new Response(
        JSON.stringify({ error: 'Job não encontrado' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar acesso
    if (user.globalRole !== 'super_admin') {
      if (execution.userId !== user.id) {
        if (execution.organizationId) {
          const hasAccess = user.organizationId === execution.organizationId
          if (!hasAccess) {
            return new Response(
              JSON.stringify({ error: 'Acesso negado' }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }
        } else {
          return new Response(
            JSON.stringify({ error: 'Acesso negado' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      }
    }

    // Criar stream SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Enviar status inicial
          const sendUpdate = (data: any) => {
            const message = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(message))
          }

          // Polling do status
          const pollInterval = setInterval(async () => {
            try {
              const currentExecution = await getExecutionById(params.id)
              
              if (!currentExecution) {
                clearInterval(pollInterval)
                controller.close()
                return
              }

              sendUpdate({
                id: currentExecution.id,
                status: currentExecution.status,
                progress: currentExecution.progress,
                currentStep: currentExecution.currentStep,
                totalSteps: currentExecution.totalSteps,
                error: currentExecution.error,
                output: currentExecution.output,
                createdAt: currentExecution.createdAt,
                startedAt: currentExecution.startedAt,
                completedAt: currentExecution.completedAt,
              })

              // Se concluído, parar polling
              if (
                currentExecution.status === 'completed' ||
                currentExecution.status === 'failed' ||
                currentExecution.status === 'cancelled'
              ) {
                clearInterval(pollInterval)
                setTimeout(() => controller.close(), 1000)
              }
            } catch (error) {
              console.error('Erro no polling:', error)
            }
          }, 1000) // Poll a cada 1 segundo

          // Cleanup quando cliente desconectar
          request.signal.addEventListener('abort', () => {
            clearInterval(pollInterval)
            controller.close()
          })

          // Enviar status inicial imediatamente
          sendUpdate({
            id: execution.id,
            status: execution.status,
            progress: execution.progress,
            currentStep: execution.currentStep,
            totalSteps: execution.totalSteps,
            error: execution.error,
            output: execution.output,
            createdAt: execution.createdAt,
            startedAt: execution.startedAt,
            completedAt: execution.completedAt,
          })
        } catch (error) {
          console.error('Erro ao iniciar stream:', error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Erro ao criar stream SSE:', error)
    return new Response(
      JSON.stringify({ error: 'Erro ao criar stream de status' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

