import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health
 * Health check endpoint para monitoring
 * 
 * Retorna:
 * - 200: Sistema funcionando
 * - 503: Sistema com problemas
 */
export async function GET() {
  try {
    const checks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'unknown',
        openai: 'unknown',
      },
    }

    // Verificar conexão com banco de dados
    try {
      await db.execute('SELECT 1')
      checks.services.database = 'ok'
    } catch (error) {
      checks.services.database = 'error'
      checks.status = 'degraded'
      console.error('[Health] Database check failed:', error)
    }

    // Verificar se OpenAI API key está configurada
    if (process.env.OPENAI_API_KEY) {
      checks.services.openai = 'configured'
    } else {
      checks.services.openai = 'not_configured'
      checks.status = 'degraded'
    }

    // Retornar status apropriado
    const statusCode = checks.status === 'healthy' ? 200 : 503

    return NextResponse.json(checks, { status: statusCode })
  } catch (error) {
    console.error('[Health] Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    )
  }
}

