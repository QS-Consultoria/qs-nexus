import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { journalEntries, spedFiles } from '@/lib/db/schema/sped'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/sped/[id]/entries
 * Retorna lançamentos contábeis de um arquivo SPED
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
    const limit = parseInt(searchParams.get('limit') || '50', 10)
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

    // Buscar lançamentos
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.spedFileId, params.id))
      .orderBy(desc(journalEntries.entryDate))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      entries,
      pagination: {
        limit,
        offset,
        total: entries.length,
      },
    })
  } catch (error) {
    console.error('Error fetching entries:', error)
    return NextResponse.json({ error: 'Erro ao buscar lançamentos' }, { status: 500 })
  }
}

