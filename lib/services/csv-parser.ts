import { readFileSync, createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { createHash } from 'node:crypto'
import { NewCsvImport, NewCsvData } from '@/lib/db/schema/sped'

// ================================================================
// Tipos e Interfaces
// ================================================================

export interface CsvParseOptions {
  delimiter?: string | 'auto' // Delimitador ou 'auto' para detecção automática
  encoding?: BufferEncoding
  hasHeader?: boolean
  columnMapping?: Record<string, string> // Mapeamento: nome_coluna_csv -> nome_campo_db
  skipEmptyLines?: boolean
  trimFields?: boolean
  maxRows?: number // Limite de linhas para processamento
}

export interface CsvParseResult {
  import: Omit<NewCsvImport, 'id'>
  rows: Omit<NewCsvData, 'id' | 'csvImportId'>[]
  headers: string[]
  errors: CsvParseError[]
  stats: CsvParseStats
}

export interface CsvParseError {
  line: number
  message: string
  raw: string
}

export interface CsvParseStats {
  totalLines: number
  processedRows: number
  skippedRows: number
  errors: number
  detectedDelimiter: string
  detectedEncoding: string
}

export interface ColumnSchema {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  required?: boolean
  transform?: (value: string) => unknown
}

// Delimitadores comuns para detecção automática
const COMMON_DELIMITERS = [',', ';', '\t', '|']

// ================================================================
// Parser Principal
// ================================================================

/**
 * Parse de arquivo CSV com detecção automática de delimitador e encoding
 */
export async function parseCsvFile(
  filePath: string,
  options: CsvParseOptions = {}
): Promise<CsvParseResult> {
  const {
    delimiter = 'auto',
    encoding = 'utf-8',
    hasHeader = true,
    columnMapping,
    skipEmptyLines = true,
    trimFields = true,
    maxRows,
  } = options

  // Detectar encoding
  const detectedEncoding = detectEncoding(filePath)
  const finalEncoding = encoding === 'utf-8' ? detectedEncoding : encoding

  // Ler primeiras linhas para detecção de delimitador
  const sampleLines = await readSampleLines(filePath, 10, finalEncoding)

  // Detectar delimitador
  const detectedDelimiter = delimiter === 'auto' ? detectDelimiter(sampleLines) : delimiter

  // Calcular hash do arquivo
  const fileBuffer = readFileSync(filePath)
  const fileHash = createHash('sha256').update(fileBuffer).digest('hex')

  const result: CsvParseResult = {
    import: {
      organizationId: 'temp-org-id', // TODO: Pass organizationId from caller
      fileName: filePath.split('/').pop() || 'unknown.csv',
      filePath,
      fileHash,
      delimiter: detectedDelimiter,
      encoding: finalEncoding,
      hasHeader,
      columnMapping: columnMapping || null,
      schemaConfigId: null,
      totalRows: 0,
      importedRows: 0,
      status: 'processing',
      errorMessage: null,
    },
    rows: [],
    headers: [],
    errors: [],
    stats: {
      totalLines: 0,
      processedRows: 0,
      skippedRows: 0,
      errors: 0,
      detectedDelimiter,
      detectedEncoding: finalEncoding,
    },
  }

  // Criar stream para processar arquivo
  const fileStream = createReadStream(filePath, { encoding: finalEncoding as BufferEncoding })
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let lineNumber = 0
  let headers: string[] = []

  for await (const line of rl) {
    lineNumber++
    result.stats.totalLines++

    // Verificar limite de linhas
    if (maxRows && result.rows.length >= maxRows) {
      break
    }

    // Pular linhas vazias
    if (skipEmptyLines && !line.trim()) {
      result.stats.skippedRows++
      continue
    }

    try {
      // Parse da linha
      const fields = parseCsvLine(line, detectedDelimiter, trimFields)

      // Primeira linha como header
      if (lineNumber === 1 && hasHeader) {
        headers = fields.map(normalizeHeaderName)
        result.headers = headers
        continue
      }

      // Se não tem header, gerar nomes genéricos
      if (headers.length === 0) {
        headers = fields.map((_, i) => `col_${i + 1}`)
        result.headers = headers
      }

      // Criar objeto de dados
      const rowData: Record<string, unknown> = {}

      fields.forEach((field, index) => {
        const headerName = headers[index] || `col_${index + 1}`
        const mappedName = columnMapping?.[headerName] || headerName
        rowData[mappedName] = field
      })

      result.rows.push({
        rowNumber: hasHeader ? lineNumber - 1 : lineNumber,
        data: rowData,
      })

      result.stats.processedRows++
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        raw: line.substring(0, 200),
      })
      result.stats.errors++
    }
  }

  // Atualizar estatísticas
  result.import.totalRows = result.stats.totalLines
  result.import.importedRows = result.stats.processedRows
  result.import.status = result.stats.errors > 0 ? 'completed' : 'completed'

  return result
}

// ================================================================
// Funções de Detecção
// ================================================================

/**
 * Detecta encoding do arquivo
 */
function detectEncoding(filePath: string): BufferEncoding {
  const buffer = readFileSync(filePath)

  // Verificar BOM (Byte Order Mark)
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8'
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return 'utf16be'
  }
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'utf16le'
  }

  // Verificar se é UTF-8 válido
  if (isValidUtf8(buffer)) {
    return 'utf-8'
  }

  // Fallback para latin1
  return 'latin1'
}

/**
 * Verifica se buffer é UTF-8 válido
 */
function isValidUtf8(buffer: Buffer): boolean {
  let i = 0
  while (i < buffer.length) {
    if (buffer[i] < 0x80) {
      i++
    } else if ((buffer[i] & 0xe0) === 0xc0) {
      if (i + 1 >= buffer.length || (buffer[i + 1] & 0xc0) !== 0x80) return false
      i += 2
    } else if ((buffer[i] & 0xf0) === 0xe0) {
      if (i + 2 >= buffer.length || (buffer[i + 1] & 0xc0) !== 0x80 || (buffer[i + 2] & 0xc0) !== 0x80)
        return false
      i += 3
    } else if ((buffer[i] & 0xf8) === 0xf0) {
      if (
        i + 3 >= buffer.length ||
        (buffer[i + 1] & 0xc0) !== 0x80 ||
        (buffer[i + 2] & 0xc0) !== 0x80 ||
        (buffer[i + 3] & 0xc0) !== 0x80
      )
        return false
      i += 4
    } else {
      return false
    }
  }
  return true
}

/**
 * Lê primeiras N linhas do arquivo
 */
async function readSampleLines(
  filePath: string,
  count: number,
  encoding: BufferEncoding
): Promise<string[]> {
  const lines: string[] = []
  const fileStream = createReadStream(filePath, { encoding })
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (line.trim()) {
      lines.push(line)
    }
    if (lines.length >= count) {
      break
    }
  }

  rl.close()
  fileStream.close()

  return lines
}

/**
 * Detecta delimitador mais provável
 */
function detectDelimiter(sampleLines: string[]): string {
  if (sampleLines.length === 0) return ','

  const scores: Record<string, number> = {}

  for (const delimiter of COMMON_DELIMITERS) {
    const counts = sampleLines.map(line => {
      // Conta ocorrências fora de aspas
      let count = 0
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes
        } else if (line[i] === delimiter && !inQuotes) {
          count++
        }
      }

      return count
    })

    // Verificar consistência (todas as linhas devem ter mesmo número)
    const uniqueCounts = new Set(counts)
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length

    // Score baseado em consistência e quantidade
    if (uniqueCounts.size === 1 && avgCount > 0) {
      scores[delimiter] = avgCount * 10 // Bonus para consistência perfeita
    } else {
      scores[delimiter] = avgCount
    }
  }

  // Retornar delimitador com maior score
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : ','
}

// ================================================================
// Funções de Parse
// ================================================================

/**
 * Parse de linha CSV respeitando aspas
 */
function parseCsvLine(line: string, delimiter: string, trim: boolean): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Aspas escapadas ""
        current += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
      i++
      continue
    }

    if (char === delimiter && !inQuotes) {
      fields.push(trim ? current.trim() : current)
      current = ''
      i++
      continue
    }

    current += char
    i++
  }

  // Adicionar último campo
  fields.push(trim ? current.trim() : current)

  return fields
}

/**
 * Normaliza nome de coluna para uso como chave
 */
function normalizeHeaderName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9_]/g, '_') // Substitui caracteres especiais
    .replace(/_+/g, '_') // Remove underscores duplicados
    .replace(/^_|_$/g, '') // Remove underscores início/fim
}

// ================================================================
// Funções de Transformação
// ================================================================

/**
 * Aplica schema de colunas aos dados
 */
export function applyColumnSchema(
  data: Record<string, unknown>,
  schema: ColumnSchema[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const col of schema) {
    const value = data[col.name]

    if (value === undefined || value === null || value === '') {
      if (col.required) {
        throw new Error(`Campo obrigatório ausente: ${col.name}`)
      }
      result[col.name] = null
      continue
    }

    // Aplicar transformação customizada
    if (col.transform) {
      result[col.name] = col.transform(String(value))
      continue
    }

    // Transformação baseada no tipo
    switch (col.type) {
      case 'number':
        result[col.name] = parseNumber(String(value))
        break
      case 'date':
        result[col.name] = parseDate(String(value))
        break
      case 'boolean':
        result[col.name] = parseBoolean(String(value))
        break
      default:
        result[col.name] = String(value)
    }
  }

  return result
}

/**
 * Parse de número (formato brasileiro ou americano)
 */
function parseNumber(value: string): number | null {
  if (!value) return null

  let cleaned = value.replace(/[^\d,.-]/g, '')

  // Detectar formato
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')

    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.')
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse de data em vários formatos
 */
function parseDate(value: string): string | null {
  if (!value) return null

  // Tentar formato DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0')
    const month = brMatch[2].padStart(2, '0')
    let year = brMatch[3]
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`
    }
    return `${year}-${month}-${day}`
  }

  // Tentar formato YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  // Tentar formato DDMMYYYY
  if (/^\d{8}$/.test(value)) {
    const day = value.substring(0, 2)
    const month = value.substring(2, 4)
    const year = value.substring(4, 8)
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * Parse de booleano
 */
function parseBoolean(value: string): boolean | null {
  if (!value) return null

  const lower = value.toLowerCase().trim()

  if (['true', 'yes', 'sim', 's', '1', 'verdadeiro', 'v'].includes(lower)) {
    return true
  }

  if (['false', 'no', 'nao', 'não', 'n', '0', 'falso', 'f'].includes(lower)) {
    return false
  }

  return null
}

// ================================================================
// Funções de Geração de Markdown para RAG
// ================================================================

/**
 * Gera markdown resumido dos dados CSV para vetorização
 */
export function generateCsvSummaryMarkdown(result: CsvParseResult): string {
  let markdown = `# Dados CSV: ${result.import.fileName}\n\n`

  markdown += `## Informações do Arquivo\n\n`
  markdown += `- **Total de Linhas:** ${result.stats.totalLines}\n`
  markdown += `- **Linhas Processadas:** ${result.stats.processedRows}\n`
  markdown += `- **Delimitador:** \`${result.stats.detectedDelimiter}\`\n`
  markdown += `- **Encoding:** ${result.stats.detectedEncoding}\n\n`

  markdown += `## Colunas\n\n`
  markdown += result.headers.map(h => `- ${h}`).join('\n')
  markdown += '\n\n'

  // Amostra de dados
  if (result.rows.length > 0) {
    markdown += `## Amostra de Dados (${Math.min(5, result.rows.length)} primeiras linhas)\n\n`

    // Tabela markdown
    markdown += '| ' + result.headers.join(' | ') + ' |\n'
    markdown += '| ' + result.headers.map(() => '---').join(' | ') + ' |\n'

    const sampleRows = result.rows.slice(0, 5)
    for (const row of sampleRows) {
      const values = result.headers.map(h => String(row.data[h] || ''))
      markdown += '| ' + values.join(' | ') + ' |\n'
    }
  }

  return markdown
}

// ================================================================
// Exportações
// ================================================================

export { normalizeHeaderName, parseNumber, parseDate, parseBoolean }

