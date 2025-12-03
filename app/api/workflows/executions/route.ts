import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePermission } from '@/lib/auth/middleware'
import { listExecutions, getExecutionById, listExecutionSteps } from '@/lib/services/workflow-service'

/**
 * GET /api/workflows/executions
 * Lista histórico de execuções
 */
export async function GET(request: NextRequest) {
  // Verificar autenticação e permissão
  const authResult = await requirePermission(request, 'workflows.view')
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const workflowTemplateId = searchParams.get('workflowTemplateId')
    const organizationId = searchParams.get('organizationId')
    const executionId = searchParams.get('executionId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Se pediu uma execução específica
    if (executionId) {
      const execution = await getExecutionById(executionId)
      
      if (!execution) {
        return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 })
      }

      // Verificar acesso
      if (user.globalRole !== 'super_admin') {
        if (execution.userId !== user.id) {
          if (execution.organizationId) {
            const hasAccess = user.organizationId === execution.organizationId
            if (!hasAccess) {
              return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
            }
          } else {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
          }
        }
      }

      // Buscar steps da execução
      const steps = await listExecutionSteps(executionId)

      return NextResponse.json({ execution, steps })
    }

    // Lista de execuções
    let orgId = organizationId
    let userId: string | undefined = undefined

    // Se não super_admin, filtrar por organização/usuário
    if (user.globalRole !== 'super_admin') {
      if (!orgId && user.organizationId ? 1 : 0 > 0) {
        orgId = user.organizationId
      }
      userId = user.id // Usuários veem apenas suas próprias execuções
    }

    const executions = await listExecutions(
      workflowTemplateId || undefined,
      orgId || undefined,
      userId,
      limit
    )

    return NextResponse.json({ executions })
  } catch (error) {
    console.error('Erro ao listar execuções:', error)
    return NextResponse.json(
      { error: 'Erro ao listar execuções' },
      { status: 500 }
    )
  }
}

