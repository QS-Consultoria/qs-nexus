import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema/documents'
import { eq } from 'drizzle-orm'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { hasPermission } from '@/lib/auth/permissions'

/**
 * GET /api/documents/[id]/download
 * Download de documento
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

    if (!hasPermission(session.user.globalRole || 'viewer', 'data.view')) {
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

    // Validar acesso à organização
    if (session.user.globalRole !== 'super_admin' && doc.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Sem acesso a este documento' }, { status: 403 })
    }

    // Verificar se arquivo está ativo
    if (!doc.isActive) {
      return NextResponse.json({ error: 'Documento foi deletado' }, { status: 410 })
    }

    // Ler arquivo do disco
    const fullPath = join(process.cwd(), 'public', doc.filePath)
    
    try {
      const fileBuffer = await readFile(fullPath)
      
      // Retornar arquivo com headers apropriados
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': doc.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.originalFileName)}"`,
          'Content-Length': doc.fileSize.toString(),
        },
      })
    } catch (fileError) {
      console.error('Error reading file:', fileError)
      return NextResponse.json({ error: 'Arquivo não encontrado no servidor' }, { status: 404 })
    }
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Erro ao fazer download' }, { status: 500 })
  }
}

