import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { documentFiles, templates } from '@/lib/db/schema/rag'
import { eq, desc, asc, and, or, ilike, sql, gte, lte } from 'drizzle-orm'

// Forçar rota dinâmica
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Filtros multi-tenant e tipo de arquivo
    const organizationId = searchParams.get('organizationId')
    const fileType = searchParams.get('fileType') // 'document', 'sped', 'csv', 'all'
    
    // Filtros de período
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    // Filtros existentes
    const status = searchParams.get('status')
    const area = searchParams.get('area')
    const docType = searchParams.get('docType')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Construir condições WHERE
    const conditions = []

    // CRÍTICO: Filtro por organização para multi-tenant
    if (organizationId) {
      conditions.push(eq(documentFiles.organizationId, organizationId))
    }

    // Filtro por tipo de arquivo
    if (fileType && fileType !== 'all') {
      conditions.push(eq(documentFiles.fileType, fileType as any))
    }

    // Filtro por período
    if (dateFrom) {
      conditions.push(gte(documentFiles.createdAt, new Date(dateFrom)))
    }
    if (dateTo) {
      conditions.push(lte(documentFiles.createdAt, new Date(dateTo)))
    }

    if (status && status !== 'all') {
      conditions.push(eq(documentFiles.status, status as any))
    }

    // Filtros usando campos JSONB do metadata
    if (area && area !== 'all') {
      conditions.push(sql`${templates.metadata}->>'area' = ${area}`)
    }

    if (docType && docType !== 'all') {
      conditions.push(sql`${templates.metadata}->>'docType' = ${docType}`)
    }

    if (search) {
      conditions.push(
        or(
          ilike(documentFiles.fileName, `%${search}%`),
          ilike(templates.title, `%${search}%`)
        ) as any
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Determinar ordenação
    let orderByClause
    if (sortBy === 'fileName') {
      orderByClause = sortOrder === 'asc' ? asc(documentFiles.fileName) : desc(documentFiles.fileName)
    } else if (sortBy === 'status') {
      orderByClause = sortOrder === 'asc' ? asc(documentFiles.status) : desc(documentFiles.status)
    } else {
      // default: updatedAt
      orderByClause = sortOrder === 'asc' ? asc(documentFiles.updatedAt) : desc(documentFiles.updatedAt)
    }

    // Query base - extrai campos do metadata JSONB
    let query = db
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
        templateId: templates.id,
        templateTitle: templates.title,
        // Extrai campos do metadata JSONB
        templateArea: sql<string | null>`${templates.metadata}->>'area'`,
        templateDocType: sql<string | null>`${templates.metadata}->>'docType'`,
      })
      .from(documentFiles)
      .leftJoin(templates, eq(documentFiles.id, templates.documentFileId))

    if (whereClause) {
      query = query.where(whereClause) as any
    }

    // Aplicar ordenação
    query = query.orderBy(orderByClause) as any

    // Executar query
    const allFiles = await query
    const total = allFiles.length

    // Aplicar paginação
    const paginatedFiles = allFiles.slice(offset, offset + limit)

    return NextResponse.json({
      files: paginatedFiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Erro ao buscar documentos' }, { status: 500 })
  }
}
