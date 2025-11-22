import * as dotenv from 'dotenv'
import { db } from '../lib/db/index.js'
import { documentFiles, templates } from '../lib/db/schema/rag.js'
import { eq } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { classifyDocument, createTemplateDocument } from '../lib/services/classifier.js'
import { storeTemplate } from '../lib/services/store-embeddings.js'
import {
  readTemporaryMarkdown,
  removeTemporaryMarkdown,
  markFileCompleted,
  markFileRejected,
} from '../lib/services/file-tracker.js'
import { ConcurrencyPool, Task } from '../lib/utils/concurrency-pool.js'

dotenv.config({ path: '.env.local' })

const CLASSIFY_CONCURRENCY = parseInt(process.env.CLASSIFY_CONCURRENCY || '3', 10)

interface ClassifyResult {
  fileId: string
  filePath: string
  success: boolean
  skipped?: boolean
}

/**
 * Classifica um documento individual
 */
async function classifyDocumentTask(
  file: InferSelectModel<typeof documentFiles>
): Promise<ClassifyResult> {
  try {
    // Busca template existente (se houver)
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.documentFileId, file.id))
      .limit(1)

    if (existingTemplate[0]) {
      // Se já tem template, marca como completed (pode ter ficado em processing)
      await markFileCompleted(file.filePath, existingTemplate[0].id, file.wordsCount || 0)
      return {
        fileId: file.id,
        filePath: file.filePath,
        success: true,
        skipped: true,
      }
    }

    // Lê markdown temporário
    const markdown = readTemporaryMarkdown(file.fileHash)
    if (!markdown) {
      // Sem markdown temporário - não pode classificar
      // Mas não marca como completed porque não foi classificado
      // Deixa em processing para indicar que precisa ser reprocessado
      return {
        fileId: file.id,
        filePath: file.filePath,
        success: true,
        skipped: true,
      }
    }

    // Loga início da classificação do documento
    console.log(`\n📝 Classificando: ${file.filePath}`)

    // Classifica o documento com callback de progresso
    const classification = await classifyDocument(
      markdown,
      undefined, // configId - usa configuração ativa
      message => {
        console.log(`  ${message}`)
      }
    )

    // Extrai informações do modelo e tokens do resultado da classificação
    const modelProvider = (classification as any)._modelProvider
    const modelName = (classification as any)._modelName
    const inputTokens = (classification as any)._inputTokens
    const outputTokens = (classification as any)._outputTokens

    // Cria TemplateDocument
    const templateDoc = createTemplateDocument(
      classification,
      markdown,
      file.id,
      modelProvider,
      modelName,
      inputTokens,
      outputTokens
    )

    // Armazena template no banco
    const templateId = await storeTemplate(templateDoc, file.id)

    // Marca arquivo como completo
    await markFileCompleted(file.filePath, templateId, file.wordsCount || 0)

    // Remove markdown temporário
    removeTemporaryMarkdown(file.fileHash)

    return {
      fileId: file.id,
      filePath: file.filePath,
      success: true,
      skipped: false,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[CLASSIFY] ERRO ao classificar ${file.filePath}: ${errorMsg}`)

    // Re-lança o erro para que o ConcurrencyPool possa tratá-lo
    // O onTaskFailed será chamado após todas as tentativas
    throw new Error(`Erro ao classificar ${file.filePath}: ${errorMsg}`)
  }
}

async function main() {
  console.log('🔍 Classificando documentos...')

  // Busca arquivos processados mas não classificados
  const files = await db.select().from(documentFiles).where(eq(documentFiles.status, 'processing'))

  console.log(`📄 Encontrados ${files.length} arquivos para classificar`)
  console.log(`⚙️  Usando ${CLASSIFY_CONCURRENCY} workers paralelos\n`)

  // Cria pool de concorrência
  const pool = new ConcurrencyPool<ClassifyResult>({
    maxConcurrency: CLASSIFY_CONCURRENCY,
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    onProgress: stats => {
      const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      process.stdout.write(
        `\r📊 Progresso: ${stats.completed}/${stats.total} (${progress}%) | ` +
          `Em processamento: ${stats.inProgress} | Falhas: ${stats.failed}`
      )
    },
    onTaskFailed: async (taskId, errorMessage) => {
      // Extrai o fileId do taskId (formato: classify-{fileId})
      const match = taskId.match(/^classify-(.+)$/)
      if (match) {
        const fileId = match[1]
        try {
          // Busca o arquivo pelo ID
          const file = await db
            .select()
            .from(documentFiles)
            .where(eq(documentFiles.id, fileId))
            .limit(1)

          if (file[0]) {
            // Marca como rejeitado após todas as tentativas falharem
            await markFileRejected(
              file[0].filePath,
              `Falha na classificação após múltiplas tentativas: ${errorMessage}`
            )
            console.error(`[POOL] ✅ Arquivo marcado como rejeitado: ${file[0].fileName}`)
            console.error(
              `[POOL]    Motivo: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`
            )
          }
        } catch (rejectError) {
          console.error(
            `[POOL] ❌ ERRO ao marcar como rejeitado (fileId: ${fileId}): ${rejectError}`
          )
          if (process.env.DEBUG === 'true' && rejectError instanceof Error) {
            console.error(`[POOL]    Stack: ${rejectError.stack}`)
          }
        }
      } else {
        console.error(`[POOL] ⚠️  Não foi possível extrair fileId do taskId: ${taskId}`)
      }
    },
  })

  // Cria tarefas para cada arquivo
  const tasks: Task<ClassifyResult>[] = files.map(file => ({
    id: `classify-${file.id}`,
    execute: () => classifyDocumentTask(file),
  }))

  pool.addBatch(tasks)

  // Processa todas as tarefas
  const startTime = Date.now()
  const results = await pool.processAll()
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  // Analisa resultados
  const classified = results.filter(r => r.success && !r.result?.skipped).length
  const skipped = results.filter(r => r.success && r.result?.skipped).length
  const errors = results.filter(r => !r.success).length

  console.log(`\n\n✅ Classificação concluída em ${duration}s`)
  console.log(`   ✓ Classificados: ${classified}`)
  console.log(`   ⊘ Pulados: ${skipped}`)
  console.log(`   ✗ Erros: ${errors}`)
}

main().catch(console.error)
