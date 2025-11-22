import { NextResponse } from 'next/server'
import { getProcessingStatus } from '@/lib/services/file-tracker'
import { db } from '@/lib/db/index'
import { documentFiles, templates } from '@/lib/db/schema/rag'
import { sql, desc } from 'drizzle-orm'

// Cache por 30 segundos
export const revalidate = 30

export async function GET() {
  try {
    // Status geral
    const status = await getProcessingStatus()

    // Buscar todos os templates com campos do metadata para agrupamento
    const allTemplates = await db
      .select({
        area: sql<string | null>`${templates.metadata}->>'area'`,
        docType: sql<string | null>`${templates.metadata}->>'docType'`,
        isGold: sql<string | null>`${templates.metadata}->>'isGold'`,
        isSilver: sql<string | null>`${templates.metadata}->>'isSilver'`,
      })
      .from(templates)

    // Estatísticas por área jurídica
    const areaMap = new Map<string, number>()
    for (const template of allTemplates) {
      if (template.area) {
        areaMap.set(template.area, (areaMap.get(template.area) || 0) + 1)
      }
    }
    const areaStats = Array.from(areaMap.entries()).map(([area, count]) => ({
      area,
      count,
    }))

    // Estatísticas por tipo de documento
    const docTypeMap = new Map<string, number>()
    for (const template of allTemplates) {
      if (template.docType) {
        docTypeMap.set(template.docType, (docTypeMap.get(template.docType) || 0) + 1)
      }
    }
    const docTypeStats = Array.from(docTypeMap.entries()).map(([docType, count]) => ({
      docType,
      count,
    }))

    // Documentos GOLD e SILVER
    const goldCount = allTemplates.filter((t) => t.isGold === 'true').length
    const silverCount = allTemplates.filter((t) => t.isSilver === 'true').length

    // Últimos arquivos processados (mais recentes primeiro)
    const recentFiles = await db
      .select({
        id: documentFiles.id,
        fileName: documentFiles.fileName,
        status: documentFiles.status,
        wordsCount: documentFiles.wordsCount,
        processedAt: documentFiles.processedAt,
        updatedAt: documentFiles.updatedAt,
      })
      .from(documentFiles)
      .orderBy(desc(documentFiles.updatedAt))
      .limit(10)

    return NextResponse.json({
      summary: status,
      byArea: areaStats,
      byDocType: docTypeStats,
      gold: goldCount,
      silver: silverCount,
      recentFiles: recentFiles,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}
