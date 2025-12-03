import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePermission } from '@/lib/auth/middleware'
import {
  listWorkflows,
  createWorkflow,
  CreateWorkflowTemplateInput,
} from '@/lib/services/workflow-service'

/**
 * GET /api/workflows
 * Lista workflows disponíveis
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
    const organizationId = searchParams.get('organizationId')
    const includeShared = searchParams.get('includeShared') !== 'false'

    // Se não super_admin, usar organização do usuário
    let orgId = organizationId
    if (user.globalRole !== 'super_admin') {
      if (!orgId && user.organizationId ? 1 : 0 > 0) {
        orgId = user.organizationId
      }
      // Verificar se usuário tem acesso à organização
      if (orgId) {
        const hasAccess = user.organizationId === orgId
        if (!hasAccess) {
          return NextResponse.json({ error: 'Acesso negado à organização' }, { status: 403 })
        }
      }
    }

    const workflows = await listWorkflows(orgId || undefined, user.id, includeShared)

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error('Erro ao listar workflows:', error)
    return NextResponse.json(
      { error: 'Erro ao listar workflows' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workflows
 * Cria novo workflow
 */
export async function POST(request: NextRequest) {
  // Verificar autenticação e permissão
  const authResult = await requirePermission(request, 'workflows.create')
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const body = await request.json()

    // Validação básica
    if (!body.name || !body.langchainGraph) {
      return NextResponse.json(
        { error: 'Nome e langchainGraph são obrigatórios' },
        { status: 400 }
      )
    }

    // Se não super_admin, usar organização do usuário
    let organizationId = body.organizationId
    if (user.globalRole !== 'super_admin') {
      if (user.organizationId ? 1 : 0 === 0) {
        return NextResponse.json(
          { error: 'Usuário não pertence a nenhuma organização' },
          { status: 400 }
        )
      }
      organizationId = user.organizationId
    }

    const input: CreateWorkflowTemplateInput = {
      name: body.name,
      description: body.description,
      isShared: body.isShared || false,
      organizationId,
      langchainGraph: body.langchainGraph,
      inputSchema: body.inputSchema,
      outputSchema: body.outputSchema,
      tags: body.tags,
      category: body.category,
      version: body.version,
      createdBy: user.id,
    }

    const workflow = await createWorkflow(input)

    return NextResponse.json({ workflow }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar workflow:', error)
    return NextResponse.json(
      { error: 'Erro ao criar workflow' },
      { status: 500 }
    )
  }
}

