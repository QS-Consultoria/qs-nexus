import { readFileSync } from 'node:fs'
import * as mammoth from 'mammoth'
import { exec, execSync } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import textract from 'textract'
import { structureMarkdownWithGemini } from './markdown-structurer'

const execAsync = promisify(exec)

/**
 * Extrai texto de PDF usando pdftotext (poppler-utils) se disponível
 * Fallback para método alternativo se não estiver instalado
 */
async function extractPdfText(filePath: string): Promise<{ text: string; numpages: number }> {
  // Estratégia 1: Usar pdftotext (poppler-utils) - mais confiável para Node.js
  try {
    const { stdout } = await execAsync(`pdftotext -layout "${filePath}" -`)
    const pageCount = await getPdfPageCount(filePath)
    return { text: stdout, numpages: pageCount }
  } catch {
    // pdftotext não disponível, tentar próxima estratégia
  }

  // Estratégia 2: Usar textract que tem suporte a PDF
  try {
    const text = await new Promise<string>((resolve, reject) => {
      textract.fromFileWithPath(filePath, (error: Error | null, text: string) => {
        if (error) reject(error)
        else resolve(text)
      })
    })
    return { text, numpages: 0 }
  } catch {
    // textract falhou
  }

  // Estratégia 3: Usar subprocess com pdf-parse (evita problemas de bundling)
  try {
    const result = await extractPdfWithSubprocess(filePath)
    return result
  } catch (error) {
    throw new Error(
      `Falha ao extrair texto do PDF. Instale poppler-utils (brew install poppler) para melhor suporte a PDFs. Erro: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Obtém número de páginas do PDF
 */
async function getPdfPageCount(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${filePath}" | grep Pages | awk '{print $2}'`)
    return parseInt(stdout.trim(), 10) || 0
  } catch {
    return 0
  }
}

/**
 * Extrai PDF usando subprocess para evitar problemas de bundling
 */
async function extractPdfWithSubprocess(filePath: string): Promise<{ text: string; numpages: number }> {
  const scriptPath = join(tmpdir(), `pdf-extract-${Date.now()}.mjs`)
  
  // Script que será executado em subprocess
  const script = `
import { readFileSync } from 'fs';

// Polyfill para DOMMatrix (necessário para pdfjs-dist)
globalThis.DOMMatrix = class DOMMatrix {
  constructor() {
    this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
  }
};

const pdfParse = (await import('pdf-parse')).default;
const buffer = readFileSync(process.argv[2]);
const data = await pdfParse(buffer);
console.log(JSON.stringify({ text: data.text, numpages: data.numpages }));
`

  writeFileSync(scriptPath, script)
  
  try {
    const { stdout } = await execAsync(`node "${scriptPath}" "${filePath}"`, {
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    })
    unlinkSync(scriptPath)
    return JSON.parse(stdout.trim())
  } catch (error) {
    try { unlinkSync(scriptPath) } catch {}
    throw error
  }
}

export interface ConversionResult {
  markdown: string
  wordCount: number
}

/**
 * Limpa e normaliza o Markdown gerado
 */
function cleanMarkdownContent(markdown: string): string {
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
    markdown: cleanMarkdownContent(markdown.trim()),
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
      console.warn(
        '[CONVERTER] Gemini não disponível, usando formatação básica:',
        geminiError instanceof Error ? geminiError.message : String(geminiError)
      )
      const lines = rawText.split('\n').filter((line: string) => line.trim().length > 0)
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
    return { markdown: cleanMarkdownContent(markdown.trim()), wordCount }
  } catch (textractError) {
    // Estratégia 2: LibreOffice
    const libreOfficeAvailable = await isLibreOfficeAvailable()
    if (libreOfficeAvailable) {
      try {
        const tempDir = tmpdir()
        await execAsync(
          `libreoffice --headless --convert-to docx --outdir "${tempDir}" "${filePath}"`
        )
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
      } catch {
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
          console.warn(
            '[CONVERTER] Gemini não disponível para Pandoc output, usando markdown do Pandoc:',
            geminiError instanceof Error ? geminiError.message : String(geminiError)
          )
        }

        const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length
        return { markdown: cleanMarkdownContent(markdown.trim()), wordCount }
      } catch {
        // Continua
      }
    }

    throw new Error(
      `Falha ao converter .doc: textract falhou, LibreOffice (${libreOfficeAvailable ? 'disponível mas falhou' : 'não disponível'}), Pandoc (${pandocAvailable ? 'disponível mas falhou' : 'não disponível'})`
    )
  }
}

/**
 * Converte PDF para Markdown
 */
async function convertPdfToMarkdown(filePath: string): Promise<ConversionResult> {
  // Usa estratégias alternativas para evitar problemas com DOMMatrix no Next.js
  let pdfData: { text: string; numpages: number }
  try {
    pdfData = await extractPdfText(filePath)
  } catch (error) {
    throw new Error(
      `Falha ao extrair texto do PDF: ${error instanceof Error ? error.message : String(error)}`
    )
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
    const pageCount = pdfData.numpages || 0

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
    console.warn(
      '[CONVERTER] Gemini não disponível, usando formatação básica:',
      geminiError instanceof Error ? geminiError.message : String(geminiError)
    )
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

  const wordCount = structuredMarkdown
    .split(/\s+/)
    .filter((word: string) => word.length > 0).length
  return { markdown: cleanMarkdownContent(structuredMarkdown.trim()), wordCount }
}

/**
 * Converte TXT para Markdown
 */
async function convertTxtToMarkdown(filePath: string): Promise<ConversionResult> {
  const content = readFileSync(filePath, 'utf-8')
  
  // Texto já é praticamente markdown, apenas limpa e formata
  const lines = content.split('\n')
  const formattedLines = lines.map((line: string) => {
    const trimmed = line.trim()
    // Detecta possíveis títulos (linhas curtas em maiúsculas ou que começam com números)
    if (trimmed.length < 100 && trimmed.length > 0 && /^[A-ZÁÉÍÓÚÇÃÊÔ0-9]/.test(trimmed)) {
      // Se parece um título (curto e em maiúsculas)
      if (trimmed === trimmed.toUpperCase() && trimmed.length < 80) {
        return `## ${trimmed}`
      }
    }
    return trimmed
  })
  
  const markdown = formattedLines.join('\n')
  const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length
  
  return {
    markdown: cleanMarkdownContent(markdown),
    wordCount,
  }
}

/**
 * Detecta tipo de arquivo e converte
 */
function detectFileType(filePath: string): 'docx' | 'doc' | 'pdf' | 'txt' {
  const ext = filePath.toLowerCase().split('.').pop()
  if (ext === 'docx') return 'docx'
  if (ext === 'doc') return 'doc'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'txt') return 'txt'
  throw new Error(`Formato não suportado: .${ext}`)
}

/**
 * Converte documento para Markdown
 * Suporta: .docx, .doc, .pdf, .txt
 */
export async function convertDocument(filePath: string): Promise<ConversionResult> {
  const fileType = detectFileType(filePath)
  switch (fileType) {
    case 'docx':
      return convertDocxToMarkdown(filePath)
    case 'doc':
      return convertDocToMarkdown(filePath)
    case 'pdf':
      return convertPdfToMarkdown(filePath)
    case 'txt':
      return convertTxtToMarkdown(filePath)
    default:
      throw new Error(`Tipo não suportado: ${fileType}`)
  }
}
