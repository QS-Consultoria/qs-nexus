import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { queryCustomTable } from '@/lib/services/dynamic-data-extractor'

/**
 * GET /api/admin/schemas/[id]/records
 * Consulta registros de uma tabela customizada
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
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const orderBy = searchParams.get('orderBy') || undefined
    const orderDirection = (searchParams.get('orderDirection') || 'DESC') as 'ASC' | 'DESC'
    
    // Filtros (query params que não sejam limit, offset, orderBy, orderDirection)
    const filters: Record<string, any> = {}
    for (const [key, value] of searchParams.entries()) {
      if (!['limit', 'offset', 'orderBy', 'orderDirection'].includes(key)) {
        filters[key] = value
      }
    }
    
    const result = await queryCustomTable(params.id, orgId, {
      limit,
      offset,
      orderBy,
      orderDirection,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Erro ao consultar registros:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao consultar registros' },
      { status: 500 }
    )
  }
}

