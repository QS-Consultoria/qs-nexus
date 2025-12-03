import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema/documents'
import { eq, and } from 'drizzle-orm'
import { hasPermission } from '@/lib/auth/permissions'
import { unlink } from 'fs/promises'
import { join } from 'path'

/**
 * GET /api/documents/[id]
 * Busca detalhes de um documento
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

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, params.id))
      .limit(1)

    if (!doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    // Validar acesso
    if (session.user.globalRole !== 'super_admin' && doc.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Sem acesso a este documento' }, { status: 403 })
    }

    return NextResponse.json({ document: doc })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Erro ao buscar documento' }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/[id]
 * Atualiza metadados do documento
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!hasPermission(session.user.globalRole || 'viewer', 'documents.edit')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, params.id))
      .limit(1)

    if (!doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    // Validar acesso
    if (session.user.globalRole !== 'super_admin' && doc.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Sem acesso a este documento' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, tags } = body

    const [updated] = await db
      .update(documents)
      .set({
        title,
        description,
        tags,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, params.id))
      .returning()

    return NextResponse.json({
      message: 'Documento atualizado com sucesso',
      document: updated,
    })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Erro ao atualizar documento' }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]
 * Soft delete de documento (query param ?hard=true para hard delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!hasPermission(session.user.globalRole || 'viewer', 'documents.delete')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, params.id))
      .limit(1)

    if (!doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    // Validar acesso
    if (session.user.globalRole !== 'super_admin' && doc.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Sem acesso a este documento' }, { status: 403 })
    }

    if (hardDelete) {
      // Hard delete: remover arquivo e registro
      try {
        const fullPath = join(process.cwd(), 'public', doc.filePath)
        await unlink(fullPath)
      } catch (error) {
        console.warn('Erro ao deletar arquivo físico:', error)
        // Continuar mesmo se o arquivo não existir
      }

      await db.delete(documents).where(eq(documents.id, params.id))

      return NextResponse.json({ message: 'Documento deletado permanentemente' })
    } else {
      // Soft delete
      await db
        .update(documents)
        .set({
          isActive: false,
          deletedAt: new Date(),
          deletedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, params.id))

      return NextResponse.json({ message: 'Documento desativado' })
    }
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Erro ao deletar documento' }, { status: 500 })
  }
}
