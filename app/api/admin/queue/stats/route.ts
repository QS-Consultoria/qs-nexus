import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { spedQueue } from '@/lib/queue/sped-queue'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/queue/stats
 * Retorna estatísticas da fila de processamento SPED
 */
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Apenas super_admin pode ver estatísticas da fila
    if (session.user.globalRole !== 'super_admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Verificar se queue está disponível
    if (!spedQueue) {
      return NextResponse.json({
        error: 'Queue not configured',
        message: 'Redis não está configurado. Ver HEROKU_WORKER_SETUP.md',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      }, { status: 503 })
    }

    // Obter contadores da fila
    const [waiting, active, completed, failed] = await Promise.all([
      spedQueue.getWaitingCount(),
      spedQueue.getActiveCount(),
      spedQueue.getCompletedCount(),
      spedQueue.getFailedCount(),
    ])

    return NextResponse.json({
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    })
  } catch (error: any) {
    console.error('Error fetching queue stats:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    }, { status: 500 })
  }
}


