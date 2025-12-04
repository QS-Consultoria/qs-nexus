import { Queue } from 'bullmq'
import { redis } from './redis'

export interface SpedJobData {
  spedFileId: string
  filePath: string
  fileName: string
  organizationId: string
}

// Criar queue de processamento SPED
export const spedQueue = redis
  ? new Queue<SpedJobData>('sped-processing', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3, // Tentar até 3 vezes em caso de erro
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 25s, 125s
        },
        removeOnComplete: {
          age: 24 * 3600, // Manter logs por 24h
          count: 100, // Manter últimos 100
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Manter erros por 7 dias
        },
      },
    })
  : null

// Helper para adicionar job na fila
export async function addSpedProcessingJob(data: SpedJobData) {
  if (!spedQueue) {
    throw new Error('Redis/Queue not configured')
  }

  const job = await spedQueue.add('process-sped', data, {
    jobId: data.spedFileId, // Evita duplicatas
  })

  console.log(`📋 SPED job added to queue: ${job.id}`)
  return job
}

// Helper para obter status de um job
export async function getSpedJobStatus(spedFileId: string) {
  if (!spedQueue) {
    return { exists: false, status: 'queue_disabled' }
  }

  const job = await spedQueue.getJob(spedFileId)
  
  if (!job) {
    return { exists: false, status: 'not_found' }
  }

  const state = await job.getState()
  const progress = job.progress
  const failedReason = job.failedReason

  return {
    exists: true,
    status: state,
    progress,
    failedReason,
    attemptsMade: job.attemptsMade,
    data: job.data,
  }
}

// Helper para limpar jobs completados
export async function cleanCompletedJobs() {
  if (!spedQueue) return

  await spedQueue.clean(24 * 3600 * 1000, 100, 'completed')
  await spedQueue.clean(7 * 24 * 3600 * 1000, 0, 'failed')
  console.log('🧹 Cleaned old jobs from queue')
}

