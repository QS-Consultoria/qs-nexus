import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { documentSchemas } from '@/lib/db/schema/document-schemas'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/admin/document-schemas/[id]
 * Busca um schema específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const [schema] = await db
      .select()
      .from(documentSchemas)
      .where(
        and(
          eq(documentSchemas.id, params.id),
          eq(documentSchemas.organizationId, session.user.organizationId)
        )
      )
      .limit(1)
    
    if (!schema) {
      return NextResponse.json({ error: 'Schema não encontrado' }, { status: 404 })
    }
    
    return NextResponse.json({ schema })
    
  } catch (error: any) {
    console.error('[API] Erro ao buscar schema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar schema' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/document-schemas/[id]
 * Atualiza um schema (apenas metadata, não altera tabela SQL)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, description, isActive, isDefaultForBaseType } = body
    
    // Buscar schema
    const [schema] = await db
      .select()
      .from(documentSchemas)
      .where(
        and(
          eq(documentSchemas.id, params.id),
          eq(documentSchemas.organizationId, session.user.organizationId)
        )
      )
      .limit(1)
    
    if (!schema) {
      return NextResponse.json({ error: 'Schema não encontrado' }, { status: 404 })
    }
    
    // Atualizar
    const [updated] = await db
      .update(documentSchemas)
      .set({
        name: name ?? schema.name,
        description: description ?? schema.description,
        isActive: isActive ?? schema.isActive,
        isDefaultForBaseType: isDefaultForBaseType ?? schema.isDefaultForBaseType,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(documentSchemas.id, params.id))
      .returning()
    
    return NextResponse.json({ success: true, schema: updated })
    
  } catch (error: any) {
    console.error('[API] Erro ao atualizar schema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar schema' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/document-schemas/[id]
 * Desativa um schema (não deleta tabela SQL, apenas marca como inativo)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    await db
      .update(documentSchemas)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
        updatedBy: session.user.id 
      })
      .where(
        and(
          eq(documentSchemas.id, params.id),
          eq(documentSchemas.organizationId, session.user.organizationId)
        )
      )
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('[API] Erro ao desativar schema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao desativar schema' },
      { status: 500 }
    )
  }
}

