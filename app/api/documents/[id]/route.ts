import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { documentFiles, templates, templateChunks } from '@/lib/db/schema/rag'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'

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

    return NextResponse.json({
      file: file[0],
      template: template[0] || null,
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
