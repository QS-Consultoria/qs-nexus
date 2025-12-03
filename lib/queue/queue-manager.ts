/**
 * Queue Manager
 * Interface unificada para gerenciar jobs
 */

import { getQueue, QUEUE_NAMES } from './config'
import { WorkflowJobData } from './workers/workflow-worker'
import { SpedJobData } from './workers/sped-worker'
import { EmbeddingJobData } from './workers/embedding-worker'

/**
 * Adiciona job de workflow à fila
 */
export async function enqueueWorkflow(data: WorkflowJobData) {
  const queue = getQueue(QUEUE_NAMES.WORKFLOWS)
  
  const job = await queue.add('execute-workflow', data, {
    priority: data.organizationId ? 1 : 2, // Prioridade maior para orgs
    timeout: parseInt(process.env.WORKFLOW_TIMEOUT_MS || '300000'), // 5 minutos
  })

  console.log(`[QueueManager] Workflow enfileirado: ${job.id}`)

  return {
    jobId: job.id,
    executionId: data.executionId,
  }
}

/**
 * Adiciona job de SPED à fila
 */
export async function enqueueSped(data: SpedJobData) {
  const queue = getQueue(QUEUE_NAMES.SPED)
  
  const job = await queue.add('process-sped', data, {
    timeout: 600000, // 10 minutos
  })

  console.log(`[QueueManager] SPED enfileirado: ${job.id}`)

  return {
    jobId: job.id,
    spedFileId: data.spedFileId,
  }
}

/**
 * Adiciona job de embedding à fila
 */
export async function enqueueEmbedding(data: EmbeddingJobData) {
  const queue = getQueue(QUEUE_NAMES.EMBEDDINGS)
  
  const job = await queue.add('generate-embeddings', data, {
    timeout: 300000, // 5 minutos
  })

  console.log(`[QueueManager] Embedding enfileirado: ${job.id}`)

  return {
    jobId: job.id,
    documentId: data.documentId,
  }
}

/**
 * Obtém status de um job
 */
export async function getJobStatus(queueName: string, jobId: string) {
  const queue = getQueue(queueName)
  const job = await queue.getJob(jobId)

  if (!job) {
    return null
  }

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: await job.progress(),
    state: await job.getState(),
    returnValue: job.returnvalue,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }
}

/**
 * Cancela um job
 */
export async function cancelJob(queueName: string, jobId: string) {
  const queue = getQueue(queueName)
  const job = await queue.getJob(jobId)

  if (!job) {
    throw new Error('Job não encontrado')
  }

  await job.remove()
  
  console.log(`[QueueManager] Job cancelado: ${jobId}`)
}

/**
 * Obtém estatísticas da fila
 */
export async function getQueueStats(queueName: string) {
  const queue = getQueue(queueName)

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  }
}

