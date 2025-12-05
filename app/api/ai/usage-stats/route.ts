import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { getUsageStats } from '@/lib/services/ai-guardrails'

export const dynamic = 'force-dynamic'

/**
 * GET: Obter estatísticas de uso da OpenAI
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const stats = getUsageStats()

    return NextResponse.json({
      ...stats,
      warning: stats.estimatedTotalCost > 1 
        ? 'Custo estimado alto! Verifique uso.' 
        : undefined
    })
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}

