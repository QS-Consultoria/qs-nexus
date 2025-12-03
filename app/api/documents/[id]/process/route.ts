import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema/documents'
import { eq } from 'drizzle-orm'
import { hasPermission } from '@/lib/auth/permissions'
import { processFile } from '@/lib/services/rag-processor'
import { join } from 'path'

/**
 * POST /api/documents/[id]/process
 * Processa documento através do pipeline RAG
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!hasPermission(session.user.globalRole || 'viewer', 'data.upload')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Buscar documento
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

    // Verificar se já está processando
    if (doc.status === 'processing') {
      return NextResponse.json({ error: 'Documento já está sendo processado' }, { status: 409 })
    }

    // Verificar se já foi processado
    if (doc.status === 'completed') {
      return NextResponse.json({ message: 'Documento já foi processado' }, { status: 200 })
    }

    // Marcar como processing
    await db
      .update(documents)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, params.id))

    // Processar arquivo de forma assíncrona
    const fullPath = join(process.cwd(), 'public', doc.filePath)
    
    // Iniciar processamento em background (não aguardar)
    processFile(fullPath, (progress) => {
      // Callback para atualizar progresso (pode ser expandido no futuro)
      console.log(`[${doc.fileName}] ${progress.message} (${progress.progress}%)`)
    })
      .then(async (result) => {
        if (result.success) {
          await db
            .update(documents)
            .set({
              status: 'completed',
              processedAt: new Date(),
              errorMessage: null,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, params.id))
        } else {
          await db
            .update(documents)
            .set({
              status: 'failed',
              errorMessage: result.error || 'Erro desconhecido',
              updatedAt: new Date(),
            })
            .where(eq(documents.id, params.id))
        }
      })
      .catch(async (error) => {
        console.error(`Error processing document ${doc.id}:`, error)
        await db
          .update(documents)
          .set({
            status: 'failed',
            errorMessage: error.message || 'Erro no processamento',
            updatedAt: new Date(),
          })
          .where(eq(documents.id, params.id))
      })

    return NextResponse.json({
      message: 'Processamento iniciado',
      documentId: doc.id,
      status: 'processing',
    })
  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json({ error: 'Erro ao iniciar processamento' }, { status: 500 })
  }
}

