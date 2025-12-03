/**
 * CSV RAG Processor
 * Processa dados CSV para geração de embeddings e busca RAG
 * 
 * Fluxo:
 * 1. Recebe csvImportId após parse e salvamento em BD
 * 2. Busca dados CSV e analisa estrutura
 * 3. Gera markdown estruturado com insights
 * 4. Classifica com IA (tipo de dados, qualidade)
 * 5. Gera chunks inteligentes
 * 6. Gera embeddings
 * 7. Salva em templates + template_chunks
 */

import { db } from '../db'
import { csvImports, csvData } from '../db/schema/sped'
import { templates, templateChunks, documentFiles } from '../db/schema/rag'
import { eq } from 'drizzle-orm'
import { chunkMarkdown } from './chunker'
import { generateEmbeddings } from './embedding-generator'
import { classifyDocument, createTemplateDocument } from './classifier'

const BATCH_SIZE = 64
const MAX_TOKENS = 800
const MAX_SAMPLE_ROWS = 100

export interface CsvRagProcessingProgress {
  step: number
  totalSteps: number
  progress: number
  message: string
}

export type CsvRagProgressCallback = (progress: CsvRagProcessingProgress) => void

/**
 * Gera markdown estruturado e insights de dados CSV
 */
function generateCsvInsightMarkdown(
  csvImport: any,
  dataRows: any[],
  columnStats: Record<string, any>
): string {
  const sections: string[] = []

  // Cabeçalho
  sections.push(`# Análise de Dados CSV: ${csvImport.fileName}`)
  sections.push('')
  
  // Metadados
  sections.push('## Informações do Arquivo')
  sections.push(`- **Nome**: ${csvImport.fileName}`)
  sections.push(`- **Total de Linhas**: ${csvImport.totalRows}`)
  sections.push(`- **Linhas Importadas**: ${csvImport.importedRows}`)
  sections.push(`- **Delimitador**: \`${csvImport.delimiter}\``)
  sections.push(`- **Encoding**: ${csvImport.encoding}`)
  sections.push(`- **Possui Cabeçalho**: ${csvImport.hasHeader ? 'Sim' : 'Não'}`)
  sections.push('')

  // Estatísticas das colunas
  sections.push('## Estrutura dos Dados')
  sections.push('')
  sections.push('### Colunas')
  Object.entries(columnStats).forEach(([colName, stats]: [string, any]) => {
    sections.push(`#### ${colName}`)
    sections.push(`- Tipo detectado: ${stats.type}`)
    sections.push(`- Valores únicos: ${stats.uniqueCount}`)
    sections.push(`- Valores vazios: ${stats.nullCount}`)
    if (stats.type === 'number') {
      sections.push(`- Min: ${stats.min}, Max: ${stats.max}, Média: ${stats.avg?.toFixed(2)}`)
    }
    sections.push('')
  })

  // Amostra de dados
  sections.push('## Amostra de Dados')
  sections.push('')
  if (dataRows.length > 0) {
    const sampleSize = Math.min(10, dataRows.length)
    sections.push(`Mostrando ${sampleSize} de ${dataRows.length} linhas:`)
    sections.push('')
    
    // Formato tabela markdown
    const firstRow = dataRows[0]
    const headers = Object.keys(firstRow.rowData || {})
    
    if (headers.length > 0) {
      sections.push(`| ${headers.join(' | ')} |`)
      sections.push(`| ${headers.map(() => '---').join(' | ')} |`)
      
      dataRows.slice(0, sampleSize).forEach(row => {
        const values = headers.map(h => {
          const val = (row.rowData as any)?.[h]
          return val !== null && val !== undefined ? String(val) : ''
        })
        sections.push(`| ${values.join(' | ')} |`)
      })
    }
  }
  sections.push('')

  // Insights automáticos
  sections.push('## Insights Automáticos')
  sections.push('')
  
  const totalCols = Object.keys(columnStats).length
  const numericCols = Object.values(columnStats).filter((s: any) => s.type === 'number').length
  const categoricalCols = Object.values(columnStats).filter((s: any) => s.type === 'string').length
  
  sections.push(`- Total de colunas: ${totalCols}`)
  sections.push(`- Colunas numéricas: ${numericCols}`)
  sections.push(`- Colunas categóricas: ${categoricalCols}`)
  
  // Detecta possíveis usos
  const possibleUses: string[] = []
  if (numericCols > 3 && categoricalCols >= 1) {
    possibleUses.push('Análise financeira ou vendas')
  }
  
  const columnNames = Object.keys(columnStats)
  if (columnNames.some(h => h.toLowerCase().includes('data') || h.toLowerCase().includes('date'))) {
    possibleUses.push('Análise temporal/séries temporais')
  }
  if (categoricalCols > numericCols) {
    possibleUses.push('Classificação ou categorização')
  }
  
  if (possibleUses.length > 0) {
    sections.push('')
    sections.push('### Possíveis Usos')
    possibleUses.forEach(use => sections.push(`- ${use}`))
  }
  
  return sections.join('\n')
}

/**
 * Analisa estatísticas das colunas
 */
function analyzeColumnStats(dataRows: any[]): Record<string, any> {
  if (dataRows.length === 0) return {}

  const firstRow = dataRows[0]
  const columnNames = Object.keys(firstRow.rowData || {})
  const stats: Record<string, any> = {}

  columnNames.forEach(colName => {
    const values = dataRows
      .map(row => (row.rowData as any)?.[colName])
      .filter(v => v !== null && v !== undefined && v !== '')

    const uniqueValues = new Set(values)
    const nullCount = dataRows.length - values.length

    // Detecta tipo
    const numericValues = values
      .map(v => parseFloat(String(v)))
      .filter(n => !isNaN(n))

    const isNumeric = numericValues.length / values.length > 0.8

    stats[colName] = {
      type: isNumeric ? 'number' : 'string',
      uniqueCount: uniqueValues.size,
      nullCount,
      totalCount: dataRows.length
    }

    if (isNumeric) {
      stats[colName].min = Math.min(...numericValues)
      stats[colName].max = Math.max(...numericValues)
      stats[colName].avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
    }
  })

  return stats
}

/**
 * Processa CSV para RAG (classificação + chunking + embeddings)
 */
export async function processCsvForRag(
  csvImportId: string,
  onProgress?: CsvRagProgressCallback
): Promise<{ success: boolean; templateId?: string; error?: string; stats?: any }> {
  const totalSteps = 7

  const reportProgress = (
    step: number,
    message: string,
    progress: number
  ) => {
    if (onProgress) {
      onProgress({
        step,
        totalSteps,
        progress,
        message
      })
    }
  }

  try {
    // Etapa 1: Buscar importação CSV
    reportProgress(1, 'Buscando dados CSV...', 10)
    
    const [csvImport] = await db
      .select()
      .from(csvImports)
      .where(eq(csvImports.id, csvImportId))
      .limit(1)

    if (!csvImport) {
      return { success: false, error: 'Importação CSV não encontrada' }
    }

    // Etapa 2: Buscar dados CSV (amostra)
    reportProgress(2, 'Carregando dados CSV...', 20)
    
    const dataRows = await db
      .select()
      .from(csvData)
      .where(eq(csvData.csvImportId, csvImportId))
      .limit(MAX_SAMPLE_ROWS)

    console.log(`[CSV-RAG] Dados carregados: ${dataRows.length} linhas`)

    if (dataRows.length === 0) {
      return { success: false, error: 'Nenhum dado CSV encontrado' }
    }

    // Etapa 3: Analisar estrutura e gerar markdown
    reportProgress(3, 'Analisando estrutura dos dados...', 30)
    
    const columnStats = analyzeColumnStats(dataRows)
    const insightMarkdown = generateCsvInsightMarkdown(csvImport, dataRows, columnStats)

    console.log(`[CSV-RAG] Markdown gerado (${insightMarkdown.length} caracteres)`)

    // Etapa 4: Classificar com IA
    reportProgress(4, 'Classificando dados com IA...', 45)
    
    const classification = await classifyDocument(
      insightMarkdown,
      undefined, // usa config ativa
      message => console.log(`  [CSV-RAG] ${message}`)
    )

    console.log(`[CSV-RAG] Classificação concluída`)

    // Etapa 5: Criar document_file e template
    reportProgress(5, 'Criando template...', 60)
    
    // Criar document_file
    const [docFile] = await db
      .insert(documentFiles)
      .values({
        organizationId: csvImport.organizationId,
        createdBy: csvImport.uploadedBy,
        filePath: csvImport.filePath,
        fileName: csvImport.fileName,
        fileHash: csvImport.fileHash,
        fileType: 'csv',
        status: 'completed',
        wordsCount: insightMarkdown.split(/\s+/).length
      })
      .returning()

    const templateDoc = createTemplateDocument(
      classification,
      insightMarkdown,
      docFile.id,
      (classification as any)._modelProvider,
      (classification as any)._modelName,
      (classification as any)._inputTokens,
      (classification as any)._outputTokens,
      (classification as any)._cost
    )

    const [template] = await db
      .insert(templates)
      .values({
        documentFileId: docFile.id,
        organizationId: csvImport.organizationId,
        createdBy: csvImport.uploadedBy,
        title: `CSV: ${csvImport.fileName}`,
        markdown: insightMarkdown,
        metadata: {
          ...(templateDoc.metadata || {}),
          csvImportId: csvImport.id,
          totalRows: csvImport.totalRows,
          importedRows: csvImport.importedRows,
          columnStats
        },
        modelProvider: (classification as any)._modelProvider,
        modelName: (classification as any)._modelName,
        inputTokens: (classification as any)._inputTokens,
        outputTokens: (classification as any)._outputTokens,
        costUsd: (classification as any)._cost?.toString()
      })
      .returning()

    console.log(`[CSV-RAG] Template criado: ${template.id}`)

    // Etapa 6: Gerar chunks
    reportProgress(6, 'Gerando chunks...', 75)
    
    const chunks = chunkMarkdown(insightMarkdown, MAX_TOKENS)

    console.log(`[CSV-RAG] Chunks gerados: ${chunks.length}`)

    if (chunks.length === 0) {
      return { success: false, error: 'Nenhum chunk foi gerado' }
    }

    // Etapa 7: Gerar embeddings e salvar
    reportProgress(7, `Gerando embeddings para ${chunks.length} chunks...`, 85)
    
    const texts = chunks.map(c => c.content)
    const embeddingResults = await generateEmbeddings(texts, BATCH_SIZE, template.id)

    const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
      ...chunk,
      embedding: embeddingResults[idx].embedding
    }))

    // Salvar chunks
    const batchSize = 500
    for (let i = 0; i < chunksWithEmbeddings.length; i += batchSize) {
      const batch = chunksWithEmbeddings.slice(i, i + batchSize)
      
      await db.insert(templateChunks).values(
        batch.map(chunk => ({
          templateId: template.id,
          section: chunk.section || null,
          role: chunk.role || null,
          contentMarkdown: chunk.content,
          chunkIndex: chunk.chunkIndex,
          embedding: chunk.embedding
        }))
      )

      const progress = 85 + Math.floor((i / chunksWithEmbeddings.length) * 15)
      reportProgress(7, `Salvando chunks (${i + batch.length}/${chunksWithEmbeddings.length})...`, progress)
    }

    console.log(`[CSV-RAG] ${chunksWithEmbeddings.length} chunks salvos com embeddings`)

    reportProgress(7, 'Processamento RAG concluído!', 100)

    return {
      success: true,
      templateId: template.id,
      stats: {
        rows: dataRows.length,
        chunks: chunksWithEmbeddings.length,
        embeddings: embeddingResults.length,
        columns: Object.keys(columnStats).length
      }
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[CSV-RAG] Erro ao processar CSV para RAG:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

