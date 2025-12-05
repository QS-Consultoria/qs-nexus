import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spedFiles, chartOfAccounts, journalEntries } from '@/lib/db/schema/sped'
import { sql, eq, count, and, gte, lte, ilike } from 'drizzle-orm'

// Forçar rota dinâmica (usa searchParams)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Filtros multi-tenant
    const organizationId = searchParams.get('organizationId')
    
    // Filtros específicos SPED
    const cnpj = searchParams.get('cnpj')
    const fileType = searchParams.get('fileType') // ECD, ECF, etc.
    const status = searchParams.get('status')
    const yearFrom = searchParams.get('yearFrom')
    const yearTo = searchParams.get('yearTo')
    
    // Construir condições WHERE
    const conditions = []
    
    // CRÍTICO: Filtro por organização para multi-tenant
    if (organizationId) {
      conditions.push(eq(spedFiles.organizationId, organizationId))
    }
    
    // Filtro por CNPJ
    if (cnpj) {
      conditions.push(ilike(spedFiles.cnpj, `%${cnpj}%`))
    }
    
    // Filtro por tipo de SPED
    if (fileType && fileType !== 'all') {
      conditions.push(eq(spedFiles.fileType, fileType as any))
    }
    
    // Filtro por status
    if (status && status !== 'all') {
      conditions.push(eq(spedFiles.status, status as any))
    }
    
    // Filtro por ano fiscal
    if (yearFrom) {
      conditions.push(gte(spedFiles.periodStart, `${yearFrom}-01-01`))
    }
    if (yearTo) {
      conditions.push(lte(spedFiles.periodEnd, `${yearTo}-12-31`))
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    
    // Buscar arquivos SPED com filtros
    let query = db
      .select({
        id: spedFiles.id,
        organizationId: spedFiles.organizationId,
        fileName: spedFiles.fileName,
        cnpj: spedFiles.cnpj,
        companyName: spedFiles.companyName,
        periodStart: spedFiles.periodStart,
        periodEnd: spedFiles.periodEnd,
        status: spedFiles.status,
        totalRecords: spedFiles.totalRecords,
        processedRecords: spedFiles.processedRecords,
        createdAt: spedFiles.createdAt,
        fileType: spedFiles.fileType,
      })
      .from(spedFiles)
    
    if (whereClause) {
      query = query.where(whereClause) as any
    }
    
    const files = await query.orderBy(sql`${spedFiles.createdAt} DESC`)

    // Calcular estatísticas (aplicando os mesmos filtros)
    const totalFiles = files.length

    // Total de empresas únicas
    const uniqueCompanies = new Set(files.map(f => f.cnpj)).size

    // Total de contas (filtrado por organização se aplicável)
    let accountsQuery = db.select({ count: count() }).from(chartOfAccounts)
    if (organizationId) {
      accountsQuery = accountsQuery.where(eq(chartOfAccounts.organizationId, organizationId)) as any
    }
    const accountsCount = await accountsQuery.then(res => res[0]?.count || 0)

    // Total de lançamentos (filtrado por organização se aplicável)
    let entriesQuery = db.select({ count: count() }).from(journalEntries)
    if (organizationId) {
      entriesQuery = entriesQuery.where(eq(journalEntries.organizationId, organizationId)) as any
    }
    const entriesCount = await entriesQuery.then(res => res[0]?.count || 0)

    return NextResponse.json({
      files,
      stats: {
        totalFiles,
        totalCompanies: uniqueCompanies,
        totalAccounts: accountsCount,
        totalEntries: entriesCount,
      },
    })
  } catch (error) {
    console.error('Erro ao listar arquivos SPED:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao listar arquivos SPED',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

