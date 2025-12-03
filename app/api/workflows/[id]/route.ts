import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePermission } from '@/lib/auth/middleware'
import {
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  UpdateWorkflowTemplateInput,
} from '@/lib/services/workflow-service'

/**
 * GET /api/workflows/[id]
 * Obtém detalhes de um workflow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verificar autenticação e permissão
  const authResult = await requirePermission(request, 'workflows.view')
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
      // Verificar se workflow pertence à organização do usuário ou é compartilhado
      if (workflow.organizationId) {
        const hasAccess = user.organizationId === workflow.organizationId
        if (!hasAccess && !workflow.isShared) {
          return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }
      }
    }

    return NextResponse.json({ workflow })
  } catch (error) {
    console.error('Erro ao buscar workflow:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar workflow' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/workflows/[id]
 * Atualiza um workflow
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verificar autenticação e permissão
  const authResult = await requirePermission(request, 'workflows.create')
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const workflow = await getWorkflowById(params.id)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow não encontrado' }, { status: 404 })
    }

    // Verificar acesso (apenas criador ou super_admin)
    if (user.globalRole !== 'super_admin') {
      if (workflow.createdBy !== user.id) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    const body = await request.json()

    const input: UpdateWorkflowTemplateInput = {
      name: body.name,
      description: body.description,
      isShared: body.isShared,
      langchainGraph: body.langchainGraph,
      inputSchema: body.inputSchema,
      outputSchema: body.outputSchema,
      tags: body.tags,
      category: body.category,
      version: body.version,
      isActive: body.isActive,
    }

    const updated = await updateWorkflow(params.id, input)

    return NextResponse.json({ workflow: updated })
  } catch (error) {
    console.error('Erro ao atualizar workflow:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar workflow' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workflows/[id]
 * Deleta (desativa) um workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verificar autenticação e permissão
  const authResult = await requirePermission(request, 'workflows.delete')
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const workflow = await getWorkflowById(params.id)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow não encontrado' }, { status: 404 })
    }

    // Verificar acesso (apenas criador ou super_admin)
    if (user.globalRole !== 'super_admin') {
      if (workflow.createdBy !== user.id) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    await deleteWorkflow(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar workflow:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar workflow' },
      { status: 500 }
    )
  }
}

