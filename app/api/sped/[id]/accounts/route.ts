import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { chartOfAccounts, spedFiles } from '@/lib/db/schema/sped'
import { eq } from 'drizzle-orm'

/**
 * GET /api/sped/[id]/accounts
 * Retorna plano de contas de um arquivo SPED
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Verificar se arquivo existe e usuário tem acesso
    const [file] = await db
      .select()
      .from(spedFiles)
      .where(eq(spedFiles.id, params.id))
      .limit(1)

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    if (
      session.user.globalRole !== 'super_admin' &&
      file.organizationId &&
      session.user.organizationId !== file.organizationId
    ) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Buscar contas
    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.spedFileId, params.id))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      accounts,
      pagination: {
        limit,
        offset,
        total: accounts.length,
      },
    })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Erro ao buscar contas' }, { status: 500 })
  }
}

