import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { spedFiles } from '@/lib/db/schema/sped'
import { eq } from 'drizzle-orm'

/**
 * GET /api/sped/[id]
 * Retorna detalhes de um arquivo SPED específico
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

    const [file] = await db
      .select()
      .from(spedFiles)
      .where(eq(spedFiles.id, params.id))
      .limit(1)

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    // Verificar se usuário tem acesso (mesma organização ou super_admin)
    if (
      session.user.globalRole !== 'super_admin' &&
      file.organizationId &&
      session.user.organizationId !== file.organizationId
    ) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    return NextResponse.json(file)
  } catch (error) {
    console.error('Error fetching SPED file:', error)
    return NextResponse.json({ error: 'Erro ao buscar arquivo' }, { status: 500 })
  }
}

