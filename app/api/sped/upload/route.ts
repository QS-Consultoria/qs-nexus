import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { spedFiles } from '@/lib/db/schema/sped'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { hasPermission } from '@/lib/auth/permissions'
import { calculateFileHash } from '@/lib/utils/file-upload'
import { getUploadPath, sanitizeFileName } from '@/lib/utils/storage-path'

/**
 * POST /api/sped/upload
 * Upload de arquivos SPED (ECD, ECF, EFD)
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
        // Validar extensão (SPED aceita TXT, CSV, Excel e ODS)
        const ext = file.name.split('.').pop()?.toLowerCase()
        const validExtensions = ['txt', 'csv', 'xlsx', 'xls', 'ods', 'sped']
        if (!validExtensions.includes(ext || '')) {
          console.error(`File ${file.name} rejected: must be .txt, .csv, .xlsx, .xls, .ods or .sped`)
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

        // Criar registro no banco (valores padrão, serão preenchidos no parser)
        const today = new Date().toISOString().split('T')[0]
        const [spedFile] = await db
          .insert(spedFiles)
          .values({
            organizationId,
            uploadedBy: session.user.id,
            fileName: file.name,
            filePath: uploadPath,
            fileHash: hash,
            fileType: 'ecd', // Será detectado pelo parser
            cnpj: '00000000000000', // Será extraído pelo parser
            companyName: 'A ser processado',
            periodStart: today,
            periodEnd: today,
            status: 'pending',
          })
          .returning()

        uploadedFiles.push(spedFile)
      } catch (error) {
        console.error(`Error uploading SPED file ${file.name}:`, error)
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo foi processado com sucesso' }, { status: 500 })
    }

    return NextResponse.json({
      message: `${uploadedFiles.length} arquivo(s) SPED enviado(s) com sucesso`,
      files: uploadedFiles,
    }, { status: 201 })
  } catch (error) {
    console.error('SPED upload error:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload de SPED' }, { status: 500 })
  }
}

