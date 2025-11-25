import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import {
  calculateFileHash,
  normalizeFilePath,
  markFileProcessing,
  markFileCompleted,
  markFileRejected,
  saveTemporaryMarkdown,
  readTemporaryMarkdown,
  removeTemporaryMarkdown,
  getFileByPath,
} from './file-tracker'
import { cleanMarkdown } from './docx-converter'
import { classifyDocument, createTemplateDocument } from './classifier'
import { chunkMarkdown } from './chunker'
import { generateEmbeddings } from './embedding-generator'
import { storeTemplate, storeChunks } from './store-embeddings'
import { db } from '../db/index'
import { documentFiles } from '../db/schema/rag'
import { eq } from 'drizzle-orm'
import { convertDocument } from './document-converter'

const PROJECT_ROOT = process.cwd()
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Limites de configuração
const MIN_WORDS = parseInt(process.env.MIN_WORDS || '300', 10)
const MAX_WORDS = parseInt(process.env.MAX_WORDS || '1000000', 10)
const MAX_TOKENS = parseInt(process.env.CHUNK_MAX_TOKENS || '800', 10)
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '64', 10)

export interface ProcessingProgress {
  fileName: string
  filePath: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  progress: number
  message: string
  error?: string
}

export type ProgressCallback = (progress: ProcessingProgress) => void

/**
 * Processa um arquivo completo através do pipeline RAG
 */
export async function processFile(
  filePath: string,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; error?: string }> {
  const normalizedPath = normalizeFilePath(filePath, PROJECT_ROOT)
  const fileName = filePath.split('/').pop() || normalizedPath
  const totalSteps = 6 // process, filter, classify, chunk, embed, store

  const reportProgress = (
    step: number,
    message: string,
    progress: number = 0,
    status: ProcessingProgress['status'] = 'processing',
    error?: string
  ) => {
    if (onProgress) {
      onProgress({
        fileName,
        filePath: normalizedPath,
        status,
        currentStep: step,
        totalSteps,
        progress,
        message,
        error,
      })
    }
  }

  try {
    // Etapa 1: Converter documento → Markdown
    reportProgress(1, 'Convertendo documento para Markdown...', 10)
    const fileHash = calculateFileHash(filePath)

    // Verifica se já foi processado
    const existing = await getFileByPath(normalizedPath)
    if (existing && existing.status === 'completed') {
      reportProgress(totalSteps, 'Arquivo já processado', 100, 'completed')
      return { success: true }
    }
    if (existing && existing.status === 'rejected') {
      const errorMsg = existing.rejectedReason || 'Arquivo rejeitado anteriormente'
      reportProgress(totalSteps, 'Arquivo rejeitado anteriormente', 0, 'failed', errorMsg)
      return { success: false, error: errorMsg }
    }

    const { markdown, wordCount } = await convertDocument(filePath)
    const cleanedMarkdown = cleanMarkdown(markdown)

    // Salva markdown temporário
    saveTemporaryMarkdown(fileHash, cleanedMarkdown)

    // Marca como processing
    await markFileProcessing(normalizedPath, fileHash, fileName)

    // Atualiza wordCount
    const fileInfo = await getFileByPath(normalizedPath)
    if (fileInfo) {
      await db
        .update(documentFiles)
        .set({
          wordsCount: wordCount,
          updatedAt: new Date(),
        })
        .where(eq(documentFiles.id, fileInfo.id))
    }

    reportProgress(1, 'Conversão concluída', 20)

    // Etapa 2: Filtrar por tamanho
    reportProgress(2, 'Filtrando documento...', 30)

    if (!wordCount || wordCount < MIN_WORDS) {
      const errorMsg = `Muito pequeno: ${wordCount} palavras (mínimo: ${MIN_WORDS})`
      await markFileRejected(normalizedPath, errorMsg)
      // Mantém markdown temporário para visualização na tela de detalhes
      reportProgress(2, `Rejeitado: muito pequeno (${wordCount} palavras)`, 0, 'failed', errorMsg)
      return { success: false, error: errorMsg }
    }

    if (wordCount > MAX_WORDS) {
      const errorMsg = `Muito grande: ${wordCount} palavras (máximo: ${MAX_WORDS})`
      await markFileRejected(normalizedPath, errorMsg)
      // Mantém markdown temporário para visualização na tela de detalhes
      reportProgress(2, `Rejeitado: muito grande (${wordCount} palavras)`, 0, 'failed', errorMsg)
      return { success: false, error: errorMsg }
    }

    reportProgress(2, 'Filtragem concluída', 40)

    // Etapa 3: Classificar documento
    reportProgress(3, 'Classificando documento...', 50)

    const classification = await classifyDocument(
      cleanedMarkdown,
      undefined, // configId - usa configuração ativa
      message => {
        // Log de progresso da classificação
        console.log(`  [${fileName}] ${message}`)
      }
    )

    // Extrai informações do modelo, tokens e custo do resultado da classificação
    const modelProvider = (classification as any)._modelProvider
    const modelName = (classification as any)._modelName
    const inputTokens = (classification as any)._inputTokens
    const outputTokens = (classification as any)._outputTokens
    const cost = (classification as any)._cost

    const templateDoc = createTemplateDocument(
      classification,
      cleanedMarkdown,
      fileInfo!.id,
      modelProvider,
      modelName,
      inputTokens,
      outputTokens,
      cost
    )
    const templateId = await storeTemplate(templateDoc, fileInfo!.id)

    reportProgress(3, 'Classificação concluída', 60)

    // Etapa 4: Gerar chunks
    reportProgress(4, 'Gerando chunks...', 70)
    const chunks = chunkMarkdown(cleanedMarkdown, MAX_TOKENS)

    if (chunks.length === 0) {
      const errorMsg = 'Nenhum chunk gerado'
      await markFileRejected(normalizedPath, errorMsg)
      removeTemporaryMarkdown(fileHash)
      reportProgress(4, 'Rejeitado: nenhum chunk gerado', 0, 'failed', errorMsg)
      return { success: false, error: errorMsg }
    }

    reportProgress(4, `${chunks.length} chunks gerados`, 75)

    // Etapa 5: Gerar embeddings
    reportProgress(5, 'Gerando embeddings...', 80)
    const texts = chunks.map(c => c.content)
    const embeddingResults = await generateEmbeddings(texts, BATCH_SIZE, templateId)

    // Combina chunks com embeddings
    const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
      ...chunk,
      embedding: embeddingResults[idx].embedding,
    }))

    reportProgress(5, 'Embeddings gerados', 90)

    // Etapa 6: Armazenar chunks
    reportProgress(6, 'Armazenando chunks...', 95)
    await storeChunks(templateId, chunksWithEmbeddings)

    // Marca como completo
    await markFileCompleted(normalizedPath, templateId, wordCount)

    // Remove markdown temporário
    removeTemporaryMarkdown(fileHash)

    reportProgress(6, 'Processamento concluído', 100, 'completed')

    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[RAG-PROCESSOR] Erro ao processar ${fileName}:`, errorMsg)

    // Marca como rejeitado em caso de erro
    try {
      const fileInfo = await getFileByPath(normalizedPath)
      if (fileInfo) {
        await markFileRejected(normalizedPath, `Erro no processamento: ${errorMsg}`)
      }
    } catch (rejectError) {
      console.error(`[RAG-PROCESSOR] Erro ao marcar como rejeitado:`, rejectError)
    }

    reportProgress(totalSteps, `Erro: ${errorMsg}`, 0, 'failed')

    return { success: false, error: errorMsg }
  }
}

/**
 * Processa múltiplos arquivos em paralelo
 */
export async function processFiles(
  filePaths: string[],
  onProgress?: (fileName: string, progress: ProcessingProgress) => void
): Promise<Array<{ filePath: string; success: boolean; error?: string }>> {
  const results = await Promise.allSettled(
    filePaths.map(async filePath => {
      const fileName = filePath.split('/').pop() || filePath
      const result = await processFile(filePath, progress => {
        if (onProgress) {
          onProgress(fileName, progress)
        }
      })
      return { filePath, ...result }
    })
  )

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      const filePath = result.reason?.filePath || 'unknown'
      return {
        filePath,
        success: false,
        error: result.reason?.message || 'Unknown error',
      }
    }
  })
}
