import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Parser SPED - Suporta ECD, ECF, EFD
 * 
 * Formato SPED:
 * - Arquivo TXT delimitado por pipe |
 * - Cada linha é um registro
 * - Formato: |REG|campo1|campo2|campo3|...|
 * 
 * Registros principais ECD:
 * - 0000: Abertura (CNPJ, empresa, período)
 * - C050: Plano de Contas
 * - I150: Saldos periódicos
 * - I200: Lançamentos contábeis
 * - I250: Partidas do lançamento
 */

export interface SpedHeader {
  tipo: 'ecd' | 'ecf' | 'efd_icms_ipi' | 'efd_contribuicoes' | 'efd_reinf'
  cnpj: string
  razaoSocial: string
  dataInicio: string
  dataFim: string
  uf?: string
  municipio?: string
}

export interface SpedAccount {
  codigo: string
  nome: string
  tipo: 'S' | 'A' // Sintética ou Analítica
  nivel: number
  codigoPai?: string
  natureza?: string
}

export interface SpedEntry {
  numero: string
  data: string
  valor: string
  descricao?: string
  tipo?: string
}

export interface SpedParseResult {
  header: SpedHeader | null
  accounts: SpedAccount[]
  entries: SpedEntry[]
  totalLines: number
  errors: string[]
}

/**
 * Parse arquivo SPED
 */
export async function parseSpedFile(filePath: string): Promise<SpedParseResult> {
  const result: SpedParseResult = {
    header: null,
    accounts: [],
    entries: [],
    totalLines: 0,
    errors: [],
  }

  try {
    const fullPath = join(process.cwd(), 'public', filePath)
    const content = await readFile(fullPath, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())
    
    result.totalLines = lines.length

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (!line.startsWith('|')) continue

      try {
        const fields = line.split('|').filter(f => f.trim())
        const registro = fields[0]

        switch (registro) {
          case '0000':
            result.header = parse0000(fields)
            break
          
          case 'C050':
            const account = parseC050(fields)
            if (account) result.accounts.push(account)
            break
          
          case 'I200':
            const entry = parseI200(fields)
            if (entry) result.entries.push(entry)
            break
        }
      } catch (err: any) {
        result.errors.push(`Line ${i + 1}: ${err.message}`)
      }
    }

    console.log(`✅ SPED parsed: ${result.accounts.length} accounts, ${result.entries.length} entries`)
    
  } catch (error: any) {
    result.errors.push(`File read error: ${error.message}`)
    console.error('❌ SPED parse error:', error)
  }

  return result
}

/**
 * Parse registro 0000 - Abertura do arquivo
 * Formato ECD: |0000|014|0|01012023|31122023|RAZAO SOCIAL|12345678000199|UF|MUN|...|
 */
function parse0000(fields: string[]): SpedHeader | null {
  try {
    // Detectar tipo pelo código leiaute
    const leiaute = fields[1] || ''
    let tipo: SpedHeader['tipo'] = 'ecd'
    
    if (leiaute.startsWith('01')) tipo = 'ecd' // ECD
    else if (leiaute.startsWith('02')) tipo = 'ecf' // ECF
    else if (leiaute.startsWith('00')) tipo = 'efd_icms_ipi' // EFD ICMS/IPI
    
    // Posições variam por tipo, mas geralmente:
    const dataInicio = fields[3] || ''
    const dataFim = fields[4] || ''
    const razaoSocial = fields[5] || 'Não informado'
    const cnpj = fields[6] || '00000000000000'
    const uf = fields[7] || ''
    const municipio = fields[8] || ''

    return {
      tipo,
      cnpj: formatCNPJ(cnpj),
      razaoSocial,
      dataInicio: formatDate(dataInicio),
      dataFim: formatDate(dataFim),
      uf,
      municipio,
    }
  } catch (error) {
    console.error('Error parsing 0000:', error)
    return null
  }
}

/**
 * Parse registro C050 - Plano de Contas
 * Formato: |C050|AAAAMMDD|CTA|DESCRICAO|TIPO|NIVEL|CTA_SUP|NAT_CONTA|
 */
function parseC050(fields: string[]): SpedAccount | null {
  try {
    const codigo = fields[2] || ''
    const nome = fields[3] || ''
    const tipo = (fields[4] || 'S') as 'S' | 'A'
    const nivel = parseInt(fields[5] || '1', 10)
    const codigoPai = fields[6] || undefined
    const natureza = fields[7] || undefined

    if (!codigo) return null

    return {
      codigo,
      nome,
      tipo,
      nivel,
      codigoPai,
      natureza,
    }
  } catch (error) {
    console.error('Error parsing C050:', error)
    return null
  }
}

/**
 * Parse registro I200 - Lançamento Contábil
 * Formato: |I200|NUM_LANC|DT_LANC|VL_LANC|TIPO_LANC|...|
 */
function parseI200(fields: string[]): SpedEntry | null {
  try {
    const numero = fields[1] || ''
    const data = fields[2] || ''
    const valor = fields[3] || '0'
    const tipo = fields[4] || ''

    if (!numero) return null

    return {
      numero,
      data: formatDate(data),
      valor,
      tipo,
    }
  } catch (error) {
    console.error('Error parsing I200:', error)
    return null
  }
}

/**
 * Helpers de formatação
 */
function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '').padStart(14, '0')
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function formatDate(dateStr: string): string {
  // DDMMAAAA ou AAAAMMDD
  if (!dateStr || dateStr.length !== 8) return new Date().toISOString().split('T')[0]
  
  // Tentar AAAAMMDD primeiro
  if (parseInt(dateStr.slice(0, 4)) > 1900) {
    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)
    return `${year}-${month}-${day}`
  }
  
  // DDMMAAAA
  const day = dateStr.slice(0, 2)
  const month = dateStr.slice(2, 4)
  const year = dateStr.slice(4, 8)
  return `${year}-${month}-${day}`
}

