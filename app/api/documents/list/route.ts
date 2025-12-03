import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema/documents'
import { ragUsers } from '@/lib/db/schema/rag-users'
import { eq, and, desc, asc, ilike, gte, lte, sql } from 'drizzle-orm'
import { hasPermission } from '@/lib/auth/permissions'

/**
 * GET /api/documents/list
 * Lista documentos com filtro OBRIGATÓRIO por organizationId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!hasPermission(session.user.globalRole || 'viewer', 'documents.view')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // CRÍTICO: organizationId é OBRIGATÓRIO
    const organizationId = searchParams.get('organizationId')
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório' }, { status: 400 })
    }

    // Validar acesso à organização
    if (session.user.globalRole !== 'super_admin' && session.user.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Sem acesso a esta organização' }, { status: 403 })
    }

    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Filtros
    const status = searchParams.get('status')
    const documentType = searchParams.get('documentType')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Construir WHERE clause
    const conditions = [
      eq(documents.organizationId, organizationId),
      eq(documents.isActive, true), // Apenas documentos ativos
    ]

    if (status && status !== 'all') {
      conditions.push(eq(documents.status, status as any))
    }

    if (documentType && documentType !== 'all') {
      conditions.push(eq(documents.documentType, documentType as any))
    }

    if (search) {
      conditions.push(
        sql`(
          ${documents.fileName} ILIKE ${`%${search}%`} OR
          ${documents.title} ILIKE ${`%${search}%`} OR
          ${documents.description} ILIKE ${`%${search}%`}
        )`
      )
    }

    if (dateFrom) {
      conditions.push(gte(documents.createdAt, new Date(dateFrom)))
    }

    if (dateTo) {
      conditions.push(lte(documents.createdAt, new Date(dateTo)))
    }

    // Ordenação
    const orderByColumn = sortBy === 'fileName' 
      ? documents.fileName 
      : sortBy === 'fileSize'
      ? documents.fileSize
      : sortBy === 'status'
      ? documents.status
      : documents.createdAt

    const orderBy = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)

    // Query com join para pegar nome do uploader
    const results = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        originalFileName: documents.originalFileName,
        fileSize: documents.fileSize,
        documentType: documents.documentType,
        status: documents.status,
        title: documents.title,
        description: documents.description,
        tags: documents.tags,
        totalChunks: documents.totalChunks,
        totalTokens: documents.totalTokens,
        processedAt: documents.processedAt,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        uploadedBy: {
          id: ragUsers.id,
          name: ragUsers.name,
          email: ragUsers.email,
        },
      })
      .from(documents)
      .leftJoin(ragUsers, eq(documents.uploadedBy, ragUsers.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    // Contar total para paginação
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(and(...conditions))

    // Calcular estatísticas
    const [statsResult] = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${documents.status} = 'pending')`,
        processing: sql<number>`count(*) filter (where ${documents.status} = 'processing')`,
        completed: sql<number>`count(*) filter (where ${documents.status} = 'completed')`,
        failed: sql<number>`count(*) filter (where ${documents.status} = 'failed')`,
      })
      .from(documents)
      .where(eq(documents.organizationId, organizationId))

    return NextResponse.json({
      documents: results,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
      stats: {
        total: Number(statsResult.total),
        pending: Number(statsResult.pending) + Number(statsResult.processing),
        completed: Number(statsResult.completed),
        failed: Number(statsResult.failed),
      },
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Erro ao buscar documentos' }, { status: 500 })
  }
}

