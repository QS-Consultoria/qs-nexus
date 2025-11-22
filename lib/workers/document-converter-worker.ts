import { parentPort } from 'node:worker_threads'
import { readFileSync } from 'node:fs'
import * as mammoth from 'mammoth'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, unlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import textract from 'textract'
import { structureMarkdownWithGemini } from '../services/markdown-structurer.ts'

const require = createRequire(import.meta.url)
const pdfParseModule = require('pdf-parse')
// pdf-parse v2.4.5 exporta a classe PDFParse
const PDFParse = pdfParseModule.PDFParse

const execAsync = promisify(exec)

export interface ConversionResult {
  markdown: string
  wordCount: number
}

/**
 * Worker thread para conversão de documentos → Markdown
 * Suporta: .docx, .doc, .pdf
 * Isola o processamento CPU-bound para não bloquear o event loop principal
 */
if (!parentPort) {
  throw new Error('Worker must be run as a worker thread')
}

// Garante que parentPort não é null após verificação
const port = parentPort

/**
 * Limpa e normaliza o Markdown gerado
 */
function cleanMarkdown(markdown: string): string {
  let cleaned = markdown.replace(/\n{3,}/g, '\n\n')
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .join('\n')
  return cleaned.trim()
}

/**
 * Verifica se Pandoc está disponível
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
 * Verifica se LibreOffice está disponível
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
 * Converte DOCX para Markdown
 */
async function convertDocxToMarkdown(filePath: string): Promise<ConversionResult> {
  const buffer = readFileSync(filePath)
  const result = await (mammoth as any).convertToMarkdown({ buffer })
  const markdown = result.value
  const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length
  return {
    markdown: cleanMarkdown(markdown.trim()),
    wordCount,
  }
}

/**
 * Converte DOC para Markdown
 */
async function convertDocToMarkdown(filePath: string): Promise<ConversionResult> {
  // Estratégia 1: textract
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
      console.warn('[WORKER] Gemini não disponível, usando formatação básica:', geminiError instanceof Error ? geminiError.message : String(geminiError))
      const lines = rawText.split('\n').filter((line: string) => line.trim().length > 0)
      let basicMarkdown = lines.join('\n\n')
    const formattedLines = lines.map((line: string) => {
      const trimmed = line.trim()
      if (trimmed.length < 100 && trimmed.length > 0 && /^[A-ZÁÉÍÓÚÇÃÊÔ]/.test(trimmed)) {
        return `## ${trimmed}`
      }
      return trimmed
    })
    markdown = formattedLines.join('\n\n')
    }
    
    const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length
    return { markdown: cleanMarkdown(markdown.trim()), wordCount }
  } catch (textractError) {
    // Estratégia 2: LibreOffice
    const libreOfficeAvailable = await isLibreOfficeAvailable()
    if (libreOfficeAvailable) {
      try {
        const tempDir = tmpdir()
        await execAsync(`libreoffice --headless --convert-to docx --outdir "${tempDir}" "${filePath}"`)
        const baseName = filePath.split('/').pop()?.replace(/\.doc$/i, '') || 'converted'
        const generatedDocxPath = join(tempDir, `${baseName}.docx`)
        if (existsSync(generatedDocxPath)) {
          try {
            const result = await convertDocxToMarkdown(generatedDocxPath)
            try {
              unlinkSync(generatedDocxPath)
            } catch {
              // Ignora erro
            }
            return result
          } catch (mammothError) {
            try {
              unlinkSync(generatedDocxPath)
            } catch {
              // Ignora erro
            }
            throw mammothError
          }
        }
      } catch (libreOfficeError) {
        // Continua para próxima estratégia
      }
    }

    // Estratégia 3: Pandoc
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
          console.warn('[WORKER] Gemini não disponível para Pandoc output, usando markdown do Pandoc:', geminiError instanceof Error ? geminiError.message : String(geminiError))
        }
        
        const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length
        return { markdown: cleanMarkdown(markdown.trim()), wordCount }
      } catch (pandocError) {
        // Continua
      }
    }

    throw new Error(`Falha ao converter .doc: textract falhou, LibreOffice (${libreOfficeAvailable ? 'disponível mas falhou' : 'não disponível'}), Pandoc (${pandocAvailable ? 'disponível mas falhou' : 'não disponível'})`)
  }
}

/**
 * Converte PDF para Markdown
 */
async function convertPdfToMarkdown(filePath: string): Promise<ConversionResult> {
  // Nota: Pandoc não suporta PDF como entrada (apenas como saída)
  // Portanto, usamos pdf-parse diretamente para PDFs
  // pdf-parse (API v2.4.5 - usa classe PDFParse)
  const buffer = readFileSync(filePath)
  let pdfData
  try {
    // Usar a classe PDFParse com a API correta
    const parser = new PDFParse({ data: buffer })
    pdfData = await parser.getText()
  } catch (error) {
    throw new Error(`Falha ao extrair texto do PDF: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  let markdown = pdfData.text || ''
  
  // Verificar se o texto extraído é válido (não apenas marcadores de página)
  // Padrão mais específico para detectar apenas marcadores de página como "-- 1 of 10 --"
  // Deve começar e terminar com "--", ter números antes e depois de "of"
  const pageMarkerPattern = /^(\s*--\s*\d+\s+of\s+\d+\s*--\s*\n?\s*)+$/m
  const isOnlyPageMarkers = pageMarkerPattern.test(markdown.trim())
  
  // Remover marcadores de página específicos (formato "-- N of M --") se houver conteúdo além deles
  // Usar padrão mais específico para não remover texto válido que contenha "--" e "of"
  markdown = markdown.replace(/^--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '').trim()
  
  // Se após remover marcadores ainda temos texto válido, continuar
  if (markdown.trim().length === 0) {
    // Se o texto está vazio após remover marcadores, verificar se era apenas marcadores
    const pageCount = pdfData.total || (pdfData.pages?.length || 0)
    
    if (isOnlyPageMarkers && pageCount > 0) {
      throw new Error(
        `PDF não contém texto extraível (apenas marcadores de página). ` +
        `O PDF pode ser um documento escaneado (requer OCR) ou ter texto em formato não extraível. ` +
        `Páginas detectadas: ${pageCount}. ` +
        `Considere usar uma ferramenta de OCR para extrair o texto de PDFs escaneados.`
      )
    }
    
    if (markdown.trim().length === 0 && pageCount > 0) {
      throw new Error(
        `PDF não contém texto extraível. ` +
        `O PDF pode ser um documento escaneado (requer OCR) ou estar corrompido. ` +
        `Páginas detectadas: ${pageCount}. ` +
        `Considere usar uma ferramenta de OCR para extrair o texto de PDFs escaneados.`
      )
    }
  }
  // Tentar estruturar com Gemini se a API key estiver configurada
  let structuredMarkdown: string
  try {
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      structuredMarkdown = await structureMarkdownWithGemini(markdown)
    } else {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não configurada, usando formatação básica')
    }
  } catch (geminiError) {
    // Fallback para formatação básica se Gemini falhar
    console.warn('[WORKER] Gemini não disponível, usando formatação básica:', geminiError instanceof Error ? geminiError.message : String(geminiError))
  const lines = markdown.split('\n').filter((line: string) => line.trim().length > 0)
  const formattedLines = lines.map((line: string, index: number) => {
    const trimmed = line.trim()
    if (trimmed.length < 100 && trimmed.length > 0 && /^[A-ZÁÉÍÓÚÇÃÊÔ]/.test(trimmed)) {
      if (index === 0 || lines[index - 1].trim().length === 0) {
        return `## ${trimmed}`
      }
    }
    return trimmed
  })
    structuredMarkdown = formattedLines.join('\n\n')
  }
  
  const wordCount = structuredMarkdown.split(/\s+/).filter((word: string) => word.length > 0).length
  return { markdown: cleanMarkdown(structuredMarkdown.trim()), wordCount }
}

/**
 * Detecta tipo de arquivo e converte
 */
function detectFileType(filePath: string): 'docx' | 'doc' | 'pdf' {
  const ext = filePath.toLowerCase().split('.').pop()
  if (ext === 'docx') return 'docx'
  if (ext === 'doc') return 'doc'
  if (ext === 'pdf') return 'pdf'
  throw new Error(`Formato não suportado: .${ext}`)
}

async function convertToMarkdown(filePath: string): Promise<ConversionResult> {
  const fileType = detectFileType(filePath)
  switch (fileType) {
    case 'docx':
      return convertDocxToMarkdown(filePath)
    case 'doc':
      return convertDocToMarkdown(filePath)
    case 'pdf':
      return convertPdfToMarkdown(filePath)
    default:
      throw new Error(`Tipo não suportado: ${fileType}`)
  }
}

port.on('message', async (data: { filePath: string; taskId: string }) => {
  try {
    const { filePath, taskId } = data
    const DEBUG = process.env.DEBUG === 'true'

    if (DEBUG)
      console.error(`[WORKER-THREAD] Recebido: ${filePath.substring(filePath.length - 50)}`)

    const result = await convertToMarkdown(filePath)

    port.postMessage({
      taskId,
      success: true,
      result: {
        markdown: result.markdown,
        wordCount: result.wordCount,
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[WORKER-THREAD] ERRO: ${errorMsg} - ${data.filePath}`)
    if (process.env.DEBUG === 'true' && error instanceof Error) {
      console.error(`[WORKER-THREAD] Stack: ${error.stack}`)
    }

    port.postMessage({
      taskId: data.taskId,
      success: false,
      error: errorMsg,
    })
  }
})

