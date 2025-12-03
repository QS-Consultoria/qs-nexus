import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePermission } from '@/lib/auth/middleware'
import {
  getWorkflowById,
  createExecution,
  updateExecutionStatus,
  ExecuteWorkflowInput,
} from '@/lib/services/workflow-service'
import { enqueueWorkflow } from '@/lib/queue/queue-manager'

/**
 * POST /api/workflows/[id]/execute
 * Executa um workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verificar autenticação e permissão
  const authResult = await requirePermission(request, 'workflows.execute')
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const workflow = await getWorkflowById(params.id)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow não encontrado' }, { status: 404 })
    }

    // Verificar acesso
    if (user.globalRole !== 'super_admin') {
      if (workflow.organizationId) {
        const hasAccess = user.organizationId === workflow.organizationId
        if (!hasAccess && !workflow.isShared) {
          return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }
      }
    }

    const body = await request.json()

    // Validar input contra schema se existir
    if (workflow.inputSchema) {
      // TODO: Validar input contra inputSchema usando Zod ou similar
    }

    // Determinar organização
    let organizationId: string | undefined
    if (user.globalRole !== 'super_admin') {
      if (user.organizationId ? 1 : 0 > 0) {
        organizationId = user.organizationId || undefined
      }
    } else {
      organizationId = body.organizationId || workflow.organizationId || undefined
    }

    const executeInput: ExecuteWorkflowInput = {
      workflowTemplateId: params.id,
      organizationId,
      userId: user.id,
      input: body.input || {},
      metadata: {
        executionMode: body.executionMode || 'async',
        priority: body.priority || 'normal',
      },
    }

    // Criar execução
    const execution = await createExecution(executeInput)

    // Enfileirar para processamento assíncrono
    try {
      const { jobId } = await enqueueWorkflow({
        executionId: execution.id,
        workflowTemplateId: params.id,
        workflowName: workflow.name,
        userId: user.id,
        organizationId,
        input: body.input || {},
      })

      console.log(`[API] Workflow enfileirado: executionId=${execution.id}, jobId=${jobId}`)

      return NextResponse.json({
        execution: {
          ...execution,
          jobId,
        },
        message: 'Workflow enfileirado para execução',
      }, { status: 201 })
    } catch (queueError) {
      console.error('[API] Erro ao enfileirar workflow:', queueError)

      // Marcar execução como failed
      await updateExecutionStatus(execution.id, 'failed', {
        error: 'Erro ao enfileirar workflow',
        errorStack: queueError instanceof Error ? queueError.stack : undefined,
      })

      return NextResponse.json({
        error: 'Erro ao enfileirar workflow para execução',
        details: queueError instanceof Error ? queueError.message : 'Erro desconhecido',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Erro ao executar workflow:', error)
    return NextResponse.json(
      { error: 'Erro ao executar workflow' },
      { status: 500 }
    )
  }
}

