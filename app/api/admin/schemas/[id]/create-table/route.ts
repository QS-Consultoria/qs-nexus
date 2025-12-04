import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { createPhysicalTable } from '@/lib/services/schema-manager'

/**
 * POST /api/admin/schemas/[id]/create-table
 * Cria a tabela física no PostgreSQL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const orgId = session.user.organizationId
    
    const result = await createPhysicalTable(params.id, orgId)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Erro ao criar tabela física:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar tabela física' },
      { status: 500 }
    )
  }
}

