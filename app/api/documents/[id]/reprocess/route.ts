import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { documentFiles } from '@/lib/db/schema/rag'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { resetFileStatus } from '@/lib/services/file-tracker'
import { processFile } from '@/lib/services/rag-processor'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const fileId = params.id

    // Buscar arquivo
    const file = await db.select().from(documentFiles).where(eq(documentFiles.id, fileId)).limit(1)

    if (file.length === 0) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    const fileData = file[0]

    // Verificar se arquivo está completed
    if (fileData.status !== 'completed') {
      return NextResponse.json(
        { error: 'Apenas arquivos concluídos podem ser reprocessados' },
        { status: 400 }
      )
    }

    // Resetar status
    const resetSuccess = await resetFileStatus(fileData.filePath)
    if (!resetSuccess) {
      return NextResponse.json({ error: 'Erro ao resetar status do arquivo' }, { status: 500 })
    }

    // Reprocessar arquivo (assíncrono)
    processFile(fileData.filePath)
      .then(result => {
        if (!result.success) {
          console.error(`Erro ao reprocessar arquivo ${fileData.filePath}:`, result.error)
        }
      })
      .catch(error => {
        console.error(`Erro ao reprocessar arquivo ${fileData.filePath}:`, error)
      })

    return NextResponse.json({
      success: true,
      message: 'Reprocessamento iniciado. O arquivo será processado em segundo plano.',
    })
  } catch (error) {
    console.error('Error reprocessing document:', error)
    return NextResponse.json({ error: 'Erro ao reprocessar documento' }, { status: 500 })
  }
}

