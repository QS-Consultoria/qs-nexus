/**
 * Workers Index
 * Inicializa todos os workers
 */

import { startWorkflowWorker } from './workflow-worker'
import { startSpedWorker } from './sped-worker'
import { startEmbeddingWorker } from './embedding-worker'

/**
 * Inicia todos os workers
 */
export function startAllWorkers() {
  console.log('[Workers] Iniciando todos os workers...')

  const workers = {
    workflow: startWorkflowWorker(),
    sped: startSpedWorker(),
    embedding: startEmbeddingWorker(),
  }

  console.log('[Workers] Todos os workers iniciados')

  return workers
}

/**
 * Para todos os workers
 */
export async function stopAllWorkers(workers: ReturnType<typeof startAllWorkers>) {
  console.log('[Workers] Parando todos os workers...')

  await Promise.all([
    workers.workflow.close(),
    workers.sped.close(),
    workers.embedding.close(),
  ])

  console.log('[Workers] Todos os workers parados')
}

