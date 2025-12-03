/**
 * Workflow Worker
 * Processa jobs de execução de workflows
 */

import { Job } from 'bullmq'
import { createWorker, QUEUE_NAMES } from '../config'
import { WorkflowEngine } from '@/lib/orchestration/workflow-engine'
import { getWorkflowById } from '@/lib/services/workflow-service'

/**
 * Job data para workflows
 */
export interface WorkflowJobData {
  executionId: string
  workflowTemplateId: string
  workflowName: string
  userId: string
  organizationId?: string
  input: Record<string, any>
}

/**
 * Processador de jobs de workflow
 */
async function processWorkflowJob(job: Job<WorkflowJobData>) {
  const { executionId, workflowTemplateId, workflowName, userId, organizationId, input } = job.data

  console.log(`[WorkflowWorker] Processando workflow: ${executionId}`)

  try {
    // Buscar template do workflow
    const template = await getWorkflowById(workflowTemplateId)
    
    if (!template) {
      throw new Error(`Template de workflow não encontrado: ${workflowTemplateId}`)
    }

    // Criar engine
    const engine = new WorkflowEngine(template.langchainGraph as any, {
      executionId,
      workflowName,
      userId,
      organizationId,
      input,
      state: {},
      stepIndex: 0,
    })

    // Executar workflow
    const result = await engine.execute()

    console.log(`[WorkflowWorker] Workflow concluído: ${executionId}`, {
      success: result.success,
      steps: result.totalSteps,
      tokens: result.tokensUsed,
      cost: result.cost,
    })

    return result
  } catch (error) {
    console.error(`[WorkflowWorker] Erro no workflow ${executionId}:`, error)
    throw error
  }
}

/**
 * Cria e inicia o worker de workflows
 */
export function startWorkflowWorker() {
  const worker = createWorker(QUEUE_NAMES.WORKFLOWS, processWorkflowJob, {
    concurrency: parseInt(process.env.WORKFLOW_WORKER_CONCURRENCY || '3'),
  })

  worker.on('completed', (job) => {
    console.log(`[WorkflowWorker] Job ${job.id} concluído`)
  })

  worker.on('failed', (job, error) => {
    console.error(`[WorkflowWorker] Job ${job?.id} falhou:`, error)
  })

  worker.on('error', (error) => {
    console.error(`[WorkflowWorker] Erro no worker:`, error)
  })

  console.log(`[WorkflowWorker] Worker iniciado`)

  return worker
}

