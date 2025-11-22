import { NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { templates } from '@/lib/db/schema/rag'
import { sql } from 'drizzle-orm'

// Cache por 30 segundos
export const revalidate = 30

export async function GET() {
  try {
    // Estatísticas por provider
    const providerStats = await db
      .select({
        provider: templates.modelProvider,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(templates)
      .where(sql`${templates.modelProvider} IS NOT NULL`)
      .groupBy(templates.modelProvider)

    // Estatísticas por modelo
    const modelStats = await db
      .select({
        model: templates.modelName,
        provider: templates.modelProvider,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(templates)
      .where(sql`${templates.modelName} IS NOT NULL`)
      .groupBy(templates.modelName, templates.modelProvider)
      .orderBy(sql`COUNT(*) DESC`)

    // Total de tokens
    const totalTokensResult = await db
      .select({
        totalInput: sql<number>`COALESCE(SUM(${templates.inputTokens}), 0)::bigint`,
        totalOutput: sql<number>`COALESCE(SUM(${templates.outputTokens}), 0)::bigint`,
      })
      .from(templates)
      .limit(1)

    const totalTokens = totalTokensResult[0] || { totalInput: 0, totalOutput: 0 }

    // Tokens por provider
    const tokensByProvider = await db
      .select({
        provider: templates.modelProvider,
        totalInput: sql<number>`COALESCE(SUM(${templates.inputTokens}), 0)::bigint`,
        totalOutput: sql<number>`COALESCE(SUM(${templates.outputTokens}), 0)::bigint`,
      })
      .from(templates)
      .where(sql`${templates.modelProvider} IS NOT NULL`)
      .groupBy(templates.modelProvider)

    // Tokens por modelo
    const tokensByModel = await db
      .select({
        model: templates.modelName,
        provider: templates.modelProvider,
        totalInput: sql<number>`COALESCE(SUM(${templates.inputTokens}), 0)::bigint`,
        totalOutput: sql<number>`COALESCE(SUM(${templates.outputTokens}), 0)::bigint`,
      })
      .from(templates)
      .where(sql`${templates.modelName} IS NOT NULL`)
      .groupBy(templates.modelName, templates.modelProvider)
      .orderBy(sql`COALESCE(SUM(${templates.inputTokens}), 0) + COALESCE(SUM(${templates.outputTokens}), 0) DESC`)

    return NextResponse.json({
      byProvider: providerStats.map(s => ({
        provider: s.provider,
        count: Number(s.count),
      })),
      byModel: modelStats.map(s => ({
        model: s.model,
        provider: s.provider,
        count: Number(s.count),
      })),
      totalTokens: {
        input: Number(totalTokens.totalInput),
        output: Number(totalTokens.totalOutput),
        total: Number(totalTokens.totalInput) + Number(totalTokens.totalOutput),
      },
      tokensByProvider: tokensByProvider.map(s => ({
        provider: s.provider,
        input: Number(s.totalInput),
        output: Number(s.totalOutput),
        total: Number(s.totalInput) + Number(s.totalOutput),
      })),
      tokensByModel: tokensByModel.map(s => ({
        model: s.model,
        provider: s.provider,
        input: Number(s.totalInput),
        output: Number(s.totalOutput),
        total: Number(s.totalInput) + Number(s.totalOutput),
      })),
    })
  } catch (error) {
    console.error('Error fetching model stats:', error)
    return NextResponse.json({ error: 'Erro ao buscar estatísticas de modelos' }, { status: 500 })
  }
}

