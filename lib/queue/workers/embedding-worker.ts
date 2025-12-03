/**
 * Embedding Worker
 * Processa jobs de geração de embeddings
 */

import { Job } from 'bullmq'
import { createWorker, QUEUE_NAMES } from '../config'
import { generateEmbeddings } from '@/lib/services/embedding-generator'

/**
 * Job data para embeddings
 */
export interface EmbeddingJobData {
  documentId: string
  chunks: Array<{
    id: string
    content: string
  }>
  organizationId?: string
}

/**
 * Processador de jobs de embedding
 */
async function processEmbeddingJob(job: Job<EmbeddingJobData>) {
  const { documentId, chunks, organizationId } = job.data

  console.log(`[EmbeddingWorker] Gerando embeddings para ${chunks.length} chunks`)

  try {
    // Gerar embeddings para todos os chunks
    const texts = chunks.map(c => c.content)
    const embeddings = await generateEmbeddings(texts)

    console.log(`[EmbeddingWorker] Embeddings gerados: ${embeddings.length}`)

    return {
      success: true,
      documentId,
      embeddingsCount: embeddings.length,
    }
  } catch (error) {
    console.error(`[EmbeddingWorker] Erro ao gerar embeddings:`, error)
    throw error
  }
}

/**
 * Cria e inicia o worker de embeddings
 */
export function startEmbeddingWorker() {
  const worker = createWorker(QUEUE_NAMES.EMBEDDINGS, processEmbeddingJob, {
    concurrency: parseInt(process.env.EMBEDDING_WORKER_CONCURRENCY || '5'),
  })

  worker.on('completed', (job) => {
    console.log(`[EmbeddingWorker] Job ${job.id} concluído`)
  })

  worker.on('failed', (job, error) => {
    console.error(`[EmbeddingWorker] Job ${job?.id} falhou:`, error)
  })

  console.log(`[EmbeddingWorker] Worker iniciado`)

  return worker
}

