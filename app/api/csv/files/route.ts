import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { documentFiles } from '@/lib/db/schema/rag'
import { sql, eq, count, and, gte, lte, ilike } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Filtros multi-tenant
    const organizationId = searchParams.get('organizationId')
    
    // Filtros específicos CSV
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    // Construir condições WHERE
    const conditions = [eq(documentFiles.fileType, 'csv')]
    
    // CRÍTICO: Filtro por organização para multi-tenant
    if (organizationId) {
      conditions.push(eq(documentFiles.organizationId, organizationId))
    }
    
    // Filtro por status
    if (status && status !== 'all') {
      conditions.push(eq(documentFiles.status, status as any))
    }
    
    // Filtro por período
    if (dateFrom) {
      conditions.push(gte(documentFiles.createdAt, new Date(dateFrom)))
    }
    if (dateTo) {
      conditions.push(lte(documentFiles.createdAt, new Date(dateTo)))
    }
    
    // Busca por nome de arquivo
    if (search) {
      conditions.push(ilike(documentFiles.fileName, `%${search}%`))
    }
    
    const whereClause = and(...conditions)
    
    // Buscar arquivos CSV
    const files = await db
      .select({
        id: documentFiles.id,
        organizationId: documentFiles.organizationId,
        fileName: documentFiles.fileName,
        filePath: documentFiles.filePath,
        fileType: documentFiles.fileType,
        status: documentFiles.status,
        wordsCount: documentFiles.wordsCount,
        processedAt: documentFiles.processedAt,
        createdAt: documentFiles.createdAt,
        updatedAt: documentFiles.updatedAt,
      })
      .from(documentFiles)
      .where(whereClause)
      .orderBy(sql`${documentFiles.createdAt} DESC`)
    
    // Calcular estatísticas
    const totalFiles = files.length
    
    // Total de linhas processadas (usando wordsCount como proxy)
    const totalRows = files.reduce((sum, f) => sum + (f.wordsCount || 0), 0)
    
    // Arquivos por status
    const byStatus = {
      completed: files.filter(f => f.status === 'completed').length,
      processing: files.filter(f => f.status === 'processing').length,
      pending: files.filter(f => f.status === 'pending').length,
      failed: files.filter(f => f.status === 'failed').length,
    }
    
    return NextResponse.json({
      files,
      stats: {
        totalFiles,
        totalRows,
        byStatus,
      },
    })
  } catch (error) {
    console.error('Erro ao listar arquivos CSV:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao listar arquivos CSV',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

