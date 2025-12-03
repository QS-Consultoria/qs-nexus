/**
 * BullMQ Configuration
 * Configuração de filas e workers
 */

import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq'
import IORedis from 'ioredis'

/**
 * Configuração da conexão Redis
 */
export function createRedisConnection(): IORedis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

/**
 * Opções padrão para queues
 */
export const defaultQueueOptions: QueueOptions = {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Manter últimos 100 jobs
      age: 24 * 3600, // 24 horas
    },
    removeOnFail: {
      count: 1000, // Manter últimos 1000 falhas
    },
  },
}

/**
 * Opções padrão para workers
 */
export const defaultWorkerOptions: Partial<WorkerOptions> = {
  connection: createRedisConnection(),
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
  lockDuration: 30000, // 30 segundos
  maxStalledCount: 2,
}

/**
 * Nomes das queues
 */
export const QUEUE_NAMES = {
  WORKFLOWS: 'workflows',
  SPED: 'sped',
  EMBEDDINGS: 'embeddings',
  NOTIFICATIONS: 'notifications',
} as const

/**
 * Cria uma queue
 */
export function createQueue(name: string, options?: QueueOptions): Queue {
  return new Queue(name, {
    ...defaultQueueOptions,
    ...options,
  })
}

/**
 * Cria um worker
 */
export function createWorker(
  name: string,
  processor: (job: any) => Promise<any>,
  options?: WorkerOptions
): Worker {
  return new Worker(name, processor, {
    ...defaultWorkerOptions,
    ...options,
  })
}

/**
 * Queues singleton
 */
let queues: Record<string, Queue> = {}

export function getQueue(name: string): Queue {
  if (!queues[name]) {
    queues[name] = createQueue(name)
  }
  return queues[name]
}

/**
 * Cleanup de queues (para testes ou shutdown)
 */
export async function closeQueues(): Promise<void> {
  for (const queue of Object.values(queues)) {
    await queue.close()
  }
  queues = {}
}

