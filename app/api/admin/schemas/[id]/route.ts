import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { getSchema, updateSchema, deleteSchema } from '@/lib/services/schema-manager'
import { DocumentSchemaField } from '@/lib/db/schema/document-schemas'

/**
 * GET /api/admin/schemas/[id]
 * Busca schema por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const orgId = session.user.organizationId
    
    const schema = await getSchema(params.id, orgId)
    
    if (!schema) {
      return NextResponse.json({ error: 'Schema não encontrado' }, { status: 404 })
    }
    
    return NextResponse.json({ schema })
  } catch (error) {
    console.error('[API] Erro ao buscar schema:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar schema' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/schemas/[id]
 * Atualiza schema
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const orgId = session.user.organizationId
    
    const body = await request.json()
    
    const {
      name,
      description,
      fields,
      enableRag,
      isActive
    } = body
    
    const schema = await updateSchema(params.id, orgId, {
      name,
      description,
      fields: fields as DocumentSchemaField[] | undefined,
      enableRag,
      isActive
    })
    
    return NextResponse.json({ schema })
  } catch (error) {
    console.error('[API] Erro ao atualizar schema:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar schema' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/schemas/[id]
 * Deleta schema (e opcionalmente a tabela)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const orgId = session.user.organizationId
    
    const { searchParams } = new URL(request.url)
    const dropTable = searchParams.get('dropTable') === 'true'
    
    const result = await deleteSchema(params.id, orgId, dropTable)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Erro ao deletar schema:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao deletar schema' },
      { status: 500 }
    )
  }
}

