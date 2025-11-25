import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { documentFiles, templates } from '@/lib/db/schema/rag'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { normalizeFilePath } from '@/lib/services/file-tracker'
import { processFile } from '@/lib/services/rag-processor'
import { deleteTemplateChunks } from '@/lib/services/store-embeddings'

const PROJECT_ROOT = process.cwd()

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

    // Verificar se arquivo está completed ou rejected
    if (fileData.status !== 'completed' && fileData.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Apenas arquivos concluídos ou rejeitados podem ser reprocessados' },
        { status: 400 }
      )
    }

    // Receber arquivo via FormData
    const formData = await request.formData()
    const uploadedFile = formData.get('file') as File | null

    if (!uploadedFile) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validar formato (.doc, .docx, .pdf, .txt)
    const fileName = uploadedFile.name.toLowerCase()
    const isValidFormat = fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileName.endsWith('.pdf') || fileName.endsWith('.txt')
    if (!isValidFormat) {
      return NextResponse.json(
        { error: 'Apenas arquivos DOCX, DOC ou PDF são permitidos' },
        { status: 400 }
      )
    }

    // Validar tamanho (50MB)
    if (uploadedFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 50MB)' }, { status: 400 })
    }

    // Criar diretório temporário se não existir
    const tempDir = join(PROJECT_ROOT, 'data', 'reprocess')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    // Salvar arquivo temporariamente
    const bytes = await uploadedFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempFilePath = join(tempDir, `${fileId}-${Date.now()}-${uploadedFile.name}`)
    await writeFile(tempFilePath, buffer)

    // Normalizar caminho para salvar no banco
    const normalizedPath = normalizeFilePath(tempFilePath, PROJECT_ROOT)

    // Se já existe template, deletar chunks antigos
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.documentFileId, fileId))
      .limit(1)

    if (existingTemplate.length > 0) {
      await deleteTemplateChunks(existingTemplate[0].id)
    }

    // Atualizar filePath no banco
    await db
      .update(documentFiles)
      .set({
        filePath: normalizedPath,
        fileName: uploadedFile.name,
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(documentFiles.id, fileId))

    // Processar arquivo (assíncrono)
    processFile(tempFilePath)
      .then(result => {
        if (!result.success) {
          console.error(`Erro ao reprocessar arquivo ${tempFilePath}:`, result.error)
        }
      })
      .catch(error => {
        console.error(`Erro ao reprocessar arquivo ${tempFilePath}:`, error)
      })

    return NextResponse.json({
      success: true,
      message: 'Reprocessamento completo iniciado. O arquivo será processado em segundo plano.',
    })
  } catch (error) {
    console.error('Error reprocessing document:', error)
    return NextResponse.json({ error: 'Erro ao reprocessar documento' }, { status: 500 })
  }
}

