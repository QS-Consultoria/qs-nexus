import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { csvImports } from '@/lib/db/schema/sped'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { hasPermission } from '@/lib/auth/permissions'
import { calculateFileHash } from '@/lib/utils/file-upload'
import { getUploadPath, sanitizeFileName } from '@/lib/utils/storage-path'

/**
 * POST /api/csv/upload
 * Upload de arquivos CSV
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!hasPermission(session.user.globalRole || 'viewer', 'data.upload')) {
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

    // Validar acesso à organização
    if (session.user.globalRole !== 'super_admin' && session.user.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Você não tem acesso a esta organização' }, { status: 403 })
    }

    const uploadedFiles = []

    for (const file of files) {
      try {
        // Validar extensão
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
          console.error(`File ${file.name} rejected: invalid extension`)
          continue
        }

        // Gerar hash e caminho
        const hash = await calculateFileHash(file)
        const uploadPath = getUploadPath(organizationId, file.name, hash)
        const fullPath = join(process.cwd(), 'public', uploadPath)

        // Criar diretórios
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
        await mkdir(dir, { recursive: true })

        // Salvar arquivo
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(fullPath, buffer)

        // Criar registro no banco
        const [csvImport] = await db
          .insert(csvImports)
          .values({
            delimiter: ',', // Padrão, pode ser detectado depois
            encoding: 'utf-8',
            hasHeader: true,
            status: 'pending',
          } as any) // Temporariamente ignorar tipos devido a schema antigo
          .returning()

        uploadedFiles.push(csvImport)
      } catch (error) {
        console.error(`Error uploading CSV file ${file.name}:`, error)
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo foi processado com sucesso' }, { status: 500 })
    }

    return NextResponse.json({
      message: `${uploadedFiles.length} arquivo(s) CSV enviado(s) com sucesso`,
      files: uploadedFiles,
    }, { status: 201 })
  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload de CSV' }, { status: 500 })
  }
}

