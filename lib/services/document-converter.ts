import * as mammoth from 'mammoth'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
// pdf-parse será importado dinamicamente quando necessário
import textract from 'textract'
import { cleanMarkdown } from './docx-converter'
import { structureMarkdownWithGemini } from './markdown-structurer'

const execAsync = promisify(exec)

export interface ConversionResult {
  markdown: string
  wordCount: number
}

export type FileType = 'docx' | 'doc' | 'pdf'

/**
 * Detecta o tipo de arquivo pela extensão
 */
export function detectFileType(filePath: string): FileType {
  const ext = filePath.toLowerCase().split('.').pop()
  if (ext === 'docx') return 'docx'
  if (ext === 'doc') return 'doc'
  if (ext === 'pdf') return 'pdf'
  throw new Error(`Formato de arquivo não suportado: .${ext}`)
}

/**
 * Verifica se Pandoc está disponível no sistema
 */
async function isPandocAvailable(): Promise<boolean> {
  try {
    await execAsync('pandoc --version')
    return true
  } catch {
    return false
  }
}

/**
 * Converte arquivo DOCX para Markdown usando mammoth
 */
async function convertDocxToMarkdown(filePath: string): Promise<ConversionResult> {
  try {
    const buffer = readFileSync(filePath)
    const result = await (mammoth as any).convertToMarkdown({ buffer })

    const markdown = result.value
    const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length

    return {
      markdown: cleanMarkdown(markdown.trim()),
      wordCount,
    }
  } catch (error) {
    throw new Error(
      `Failed to convert DOCX to Markdown: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Verifica se LibreOffice está disponível no sistema
 */
async function isLibreOfficeAvailable(): Promise<boolean> {
  try {
    await execAsync('libreoffice --version')
    return true
  } catch {
    return false
  }
}

/**
 * Converte arquivo DOC para Markdown
 * Estratégia:
 * 1. Tentar textract (Node.js puro, funciona em qualquer ambiente)
 * 2. Se falhar, tentar converter .doc → .docx usando LibreOffice, depois mammoth
 * 3. Se falhar, tentar Pandoc (se disponível)
 */
async function convertDocToMarkdown(filePath: string): Promise<ConversionResult> {
  // Estratégia 1: Tentar textract (Node.js puro)
  try {
    const text = await new Promise<string>((resolve, reject) => {
      textract.fromFileWithPath(filePath, (error: Error | null, text: string) => {
        if (error) reject(error)
        else resolve(text)
      })
    })

    const rawText = text
    
    // Tentar estruturar com Gemini se a API key estiver configurada
    let markdown: string
    try {
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        markdown = await structureMarkdownWithGemini(rawText)
      } else {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não configurada, usando formatação básica')
      }
    } catch (geminiError) {
      // Fallback para formatação básica se Gemini falhar
      console.warn('[SERVICE] Gemini não disponível, usando formatação básica:', geminiError instanceof Error ? geminiError.message : String(geminiError))
      const lines = rawText.split('\n').filter(line => line.trim().length > 0)
      let basicMarkdown = lines.join('\n\n')
      const formattedLines = lines.map(line => {
        const trimmed = line.trim()
        if (trimmed.length < 100 && trimmed.length > 0 && /^[A-ZÁÉÍÓÚÇÃÊÔ]/.test(trimmed)) {
          return `## ${trimmed}`
        }
        return trimmed
      })
      markdown = formattedLines.join('\n\n')
    }

    const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length

    return {
      markdown: cleanMarkdown(markdown.trim()),
      wordCount,
    }
  } catch (textractError) {
    console.warn(`Textract falhou para ${filePath}, tentando fallback:`, textractError)

    // Estratégia 2: Converter .doc → .docx usando LibreOffice, depois mammoth
    const libreOfficeAvailable = await isLibreOfficeAvailable()
    if (libreOfficeAvailable) {
      try {
        const tempDir = tmpdir()
        const tempDocxPath = join(tempDir, `${Date.now()}-${Math.random().toString(36).substring(7)}.docx`)

        // Converter .doc para .docx usando LibreOffice
        await execAsync(
          `libreoffice --headless --convert-to docx --outdir "${tempDir}" "${filePath}"`
        )

        // Encontrar o arquivo .docx gerado (LibreOffice usa o nome original sem extensão)
        const baseName = filePath.split('/').pop()?.replace(/\.doc$/i, '') || 'converted'
        const generatedDocxPath = join(tempDir, `${baseName}.docx`)

        // Verificar se o arquivo foi realmente criado
        if (!existsSync(generatedDocxPath)) {
          throw new Error(`LibreOffice não gerou o arquivo .docx esperado em ${generatedDocxPath}`)
        }

        // Se o arquivo foi gerado, usar mammoth para converter para markdown
        try {
          const result = await convertDocxToMarkdown(generatedDocxPath)
          // Limpar arquivo temporário
          try {
            unlinkSync(generatedDocxPath)
          } catch {
            // Ignora erro ao deletar arquivo temporário
          }
          return result
        } catch (mammothError) {
          // Limpar arquivo temporário mesmo em caso de erro
          try {
            unlinkSync(generatedDocxPath)
          } catch {
            // Ignora erro
          }
          throw mammothError
        }
      } catch (libreOfficeError) {
        console.warn(`LibreOffice falhou para ${filePath}, tentando Pandoc:`, libreOfficeError)
      }
    }

    // Estratégia 3: Tentar Pandoc se disponível (melhor preservação de formatação)
    const pandocAvailable = await isPandocAvailable()
    if (pandocAvailable) {
      try {
        const { stdout } = await execAsync(`pandoc "${filePath}" -t markdown`)
        let markdown = stdout
        
        // Tentar estruturar com Gemini se a API key estiver configurada
        try {
          if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            markdown = await structureMarkdownWithGemini(markdown)
          }
        } catch (geminiError) {
          // Fallback: usar markdown do Pandoc como está (já é bem estruturado)
          console.warn('[SERVICE] Gemini não disponível para Pandoc output, usando markdown do Pandoc:', geminiError instanceof Error ? geminiError.message : String(geminiError))
        }
        
        const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length

        return {
          markdown: cleanMarkdown(markdown.trim()),
          wordCount,
        }
      } catch (pandocError) {
        console.warn(`Pandoc falhou para ${filePath}:`, pandocError)
      }
    }

    // Se todas as estratégias falharam
    throw new Error(
      `Falha ao converter .doc para Markdown. Tentativas: textract (falhou), LibreOffice (${libreOfficeAvailable ? 'disponível mas falhou' : 'não disponível'}), Pandoc (${pandocAvailable ? 'disponível mas falhou' : 'não disponível'}). Para melhor qualidade, instale Pandoc ou LibreOffice.`
    )
  }
}

/**
 * Converte arquivo PDF para Markdown
 * Tenta usar Pandoc primeiro (melhor preservação), fallback para pdf-parse
 */
async function convertPdfToMarkdown(filePath: string): Promise<ConversionResult> {
  // Nota: Pandoc não suporta PDF como entrada (apenas como saída)
  // Portanto, usamos pdf-parse diretamente para PDFs
  // Usar pdf-parse para extrair texto
  try {
    const buffer = readFileSync(filePath)
    // Importar pdf-parse dinamicamente (CommonJS module)
    const pdfParseModule = await import('pdf-parse')
    // pdf-parse v2.4.5 exporta a classe PDFParse
    const PDFParse = pdfParseModule.PDFParse
    const parser = new PDFParse({ data: buffer })
    const pdfData = await parser.getText()
    let rawMarkdown = pdfData.text
    
    // Tentar estruturar com Gemini se a API key estiver configurada
    let markdown: string
    try {
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        markdown = await structureMarkdownWithGemini(rawMarkdown)
      } else {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não configurada, usando formatação básica')
      }
    } catch (geminiError) {
      // Fallback para formatação básica se Gemini falhar
      console.warn('[SERVICE] Gemini não disponível, usando formatação básica:', geminiError instanceof Error ? geminiError.message : String(geminiError))
      const lines = rawMarkdown.split('\n').filter((line: string) => line.trim().length > 0)
      const formattedLines = lines.map((line: string, index: number) => {
        const trimmed = line.trim()
        if (trimmed.length < 100 && trimmed.length > 0 && /^[A-ZÁÉÍÓÚÇÃÊÔ]/.test(trimmed)) {
          if (index === 0 || lines[index - 1].trim().length === 0) {
            return `## ${trimmed}`
          }
        }
        return trimmed
      })
      markdown = formattedLines.join('\n\n')
    }

    const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length

    return {
      markdown: cleanMarkdown(markdown.trim()),
      wordCount,
    }
  } catch (error) {
    throw new Error(
      `Failed to convert PDF to Markdown: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Converte qualquer documento suportado para Markdown
 * Roteia automaticamente para o conversor apropriado
 */
export async function convertToMarkdown(filePath: string): Promise<ConversionResult> {
  const fileType = detectFileType(filePath)

  switch (fileType) {
    case 'docx':
      return convertDocxToMarkdown(filePath)
    case 'doc':
      return convertDocToMarkdown(filePath)
    case 'pdf':
      return convertPdfToMarkdown(filePath)
    default:
      throw new Error(`Tipo de arquivo não suportado: ${fileType}`)
  }
}

