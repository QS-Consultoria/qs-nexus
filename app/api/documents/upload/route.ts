import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema/documents'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { hasPermission } from '@/lib/auth/permissions'
import { calculateFileHash, getDocumentType, getMimeType } from '@/lib/utils/file-upload'
import { getUploadPath, sanitizeFileName } from '@/lib/utils/storage-path'

export const config = {
  api: {
    bodyParser: false,
  },
}

/**
 * POST /api/documents/upload
 * Upload de documentos gerais (PDF, DOCX, TXT)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão
    if (!hasPermission(session.user.globalRole || 'viewer', 'documents.create')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const organizationId = formData.get('organizationId') as string

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório' }, { status: 400 })
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validar que o usuário pertence à organização
    if (session.user.globalRole !== 'super_admin' && session.user.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Você não tem acesso a esta organização' }, { status: 403 })
    }

    const uploadedDocs = []

    for (const file of files) {
      try {
        // Gerar hash e caminho
        const hash = await calculateFileHash(file)
        const uploadPath = getUploadPath(organizationId, file.name, hash)
        const fullPath = join(process.cwd(), 'public', uploadPath)

        // Criar diretórios se não existirem
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
        await mkdir(dir, { recursive: true })

        // Salvar arquivo
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(fullPath, buffer)

        // Criar registro no banco
        const [doc] = await db
          .insert(documents)
          .values({
            organizationId,
            uploadedBy: session.user.id,
            fileName: sanitizeFileName(file.name),
            originalFileName: file.name,
            filePath: uploadPath,
            fileSize: file.size,
            fileHash: hash,
            mimeType: file.type || getMimeType(file.name),
            documentType: getDocumentType(file.name),
            status: 'pending',
          })
          .returning()

        uploadedDocs.push(doc)
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error)
        // Continuar com os próximos arquivos
      }
    }

    if (uploadedDocs.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo foi processado com sucesso' }, { status: 500 })
    }

    return NextResponse.json({
      message: `${uploadedDocs.length} arquivo(s) enviado(s) com sucesso`,
      documents: uploadedDocs,
    }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }
}

