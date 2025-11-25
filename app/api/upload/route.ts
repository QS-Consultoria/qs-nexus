import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Criar diretório de uploads se não existir
    const uploadDir = join(process.cwd(), 'uploads', 'temp')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploadedFiles = []

    for (const file of files) {
      // Validar formato (.doc, .docx, .pdf, .txt)
      const fileName = file.name.toLowerCase()
      const isValidFormat = fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileName.endsWith('.pdf') || fileName.endsWith('.txt')
      if (!isValidFormat) {
        continue
      }

      // Validar tamanho (50MB)
      if (file.size > 50 * 1024 * 1024) {
        continue
      }

      // Salvar arquivo
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filePath = join(uploadDir, file.name)
      await writeFile(filePath, buffer)

      uploadedFiles.push({
        name: file.name,
        size: file.size,
        path: filePath,
      })
    }

    return NextResponse.json({
      message: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso`,
      files: uploadedFiles,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload dos arquivos' }, { status: 500 })
  }
}
