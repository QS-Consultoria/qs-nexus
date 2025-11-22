import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { documentFiles, templates, templateChunks } from '@/lib/db/schema/rag'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { deleteFile, denormalizeFilePath, removeTemporaryMarkdown, readTemporaryMarkdown } from '@/lib/services/file-tracker'
import { existsSync, unlinkSync } from 'fs'

// Cache por 60 segundos (detalhes mudam menos frequentemente)
export const revalidate = 60

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const fileId = params.id

    // Buscar arquivo
    const file = await db.select().from(documentFiles).where(eq(documentFiles.id, fileId)).limit(1)

    if (file.length === 0) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    // Buscar template associado
    const template = await db
      .select()
      .from(templates)
      .where(eq(templates.documentFileId, fileId))
      .limit(1)

    // Buscar chunks se template existir
    let chunks: (typeof templateChunks.$inferSelect)[] = []
    if (template.length > 0) {
      chunks = await db
        .select()
        .from(templateChunks)
        .where(eq(templateChunks.templateId, template[0].id))
        .orderBy(templateChunks.chunkIndex)
    }

    // Se não há template mas há fileHash, tenta buscar markdown temporário (para arquivos rejeitados)
    let markdownFromTemp: string | null = null
    if (template.length === 0 && file[0].fileHash) {
      markdownFromTemp = readTemporaryMarkdown(file[0].fileHash)
    }

    // Se encontrou markdown temporário mas não há template, cria um objeto template temporário para o frontend
    let templateResponse = template[0] || null
    if (!templateResponse && markdownFromTemp) {
      // Cria um template temporário com valores padrão válidos para arquivos rejeitados
      // Usa estrutura com metadata JSONB
      templateResponse = {
        id: 'temp-' + fileId,
        documentFileId: fileId,
        title: file[0].fileName,
        markdown: markdownFromTemp,
        metadata: {
          docType: 'outro',
          area: 'outro',
          jurisdiction: 'BR',
          complexity: 'medio',
          tags: [],
          summary: 'Arquivo rejeitado - markdown disponível para visualização',
          qualityScore: null,
          isGold: false,
          isSilver: false,
        },
        schemaConfigId: null,
        createdAt: file[0].createdAt,
        updatedAt: file[0].updatedAt,
      } as any
    } else if (templateResponse) {
      // Extrai campos do metadata JSONB para compatibilidade com front-end existente
      const metadata = templateResponse.metadata as any || {}
      templateResponse = {
        ...templateResponse,
        // Campos legados extraídos do metadata para compatibilidade
        docType: metadata.docType || null,
        area: metadata.area || null,
        jurisdiction: metadata.jurisdiction || 'BR',
        complexity: metadata.complexity || null,
        tags: metadata.tags || [],
        summary: metadata.summary || null,
        qualityScore: metadata.qualityScore || null,
        isGold: metadata.isGold || false,
        isSilver: metadata.isSilver || false,
      } as any
    }

    return NextResponse.json({
      file: file[0],
      template: templateResponse,
      chunks: chunks,
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Erro ao buscar documento' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const fileId = params.id
    const body = await request.json()
    const { markdown } = body

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json({ error: 'Markdown é obrigatório' }, { status: 400 })
    }

    // Buscar template associado
    const template = await db
      .select()
      .from(templates)
      .where(eq(templates.documentFileId, fileId))
      .limit(1)

    if (template.length === 0) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    // Atualizar markdown
    await db
      .update(templates)
      .set({
        markdown,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, template[0].id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating markdown:', error)
    return NextResponse.json({ error: 'Erro ao atualizar markdown' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const fileId = params.id

    // Buscar arquivo antes de deletar para obter informações (filePath, fileHash)
    const file = await db
      .select()
      .from(documentFiles)
      .where(eq(documentFiles.id, fileId))
      .limit(1)

    if (file.length === 0) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    const fileData = file[0]
    const PROJECT_ROOT = process.cwd()

    // Deletar do banco de dados (chunks, templates, document_files)
    const deleteResult = await deleteFile(fileId)

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: deleteResult.error || 'Erro ao deletar arquivo' },
        { status: 500 }
      )
    }

    // Opcional: Deletar arquivo físico do sistema de arquivos
    let physicalFileDeleted = false
    try {
      const absoluteFilePath = denormalizeFilePath(fileData.filePath, PROJECT_ROOT)
      if (existsSync(absoluteFilePath)) {
        unlinkSync(absoluteFilePath)
        physicalFileDeleted = true
      }
    } catch (error) {
      // Log mas não falha a operação se o arquivo físico não existir
      console.warn('Erro ao deletar arquivo físico:', error)
    }

    // Opcional: Deletar markdown temporário
    let markdownDeleted = false
    try {
      if (fileData.fileHash) {
        removeTemporaryMarkdown(fileData.fileHash)
        markdownDeleted = true
      }
    } catch (error) {
      // Log mas não falha a operação
      console.warn('Erro ao deletar markdown temporário:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Arquivo e todos os dados relacionados foram excluídos com sucesso',
      deleted: {
        file: deleteResult.fileDeleted,
        template: deleteResult.templateDeleted,
        chunks: deleteResult.chunksDeleted,
        embeddings: deleteResult.chunksDeleted, // Embeddings são deletados junto com chunks
        physicalFile: physicalFileDeleted,
        markdown: markdownDeleted,
      },
    })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Erro ao deletar documento' }, { status: 500 })
  }
}
