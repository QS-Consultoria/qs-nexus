/**
 * Workflow Service
 * Gerencia templates e execuções de workflows
 */

import { db } from '@/lib/db'
import {
  workflowTemplates,
  workflowExecutions,
  workflowExecutionSteps,
} from '@/lib/db/schema/workflows'
import { eq, and, desc, or } from 'drizzle-orm'

export interface CreateWorkflowTemplateInput {
  name: string
  description?: string
  isShared?: boolean
  organizationId?: string
  langchainGraph: any
  inputSchema?: any
  outputSchema?: any
  tags?: string[]
  category?: string
  version?: string
  createdBy?: string
}

export interface UpdateWorkflowTemplateInput {
  name?: string
  description?: string
  isShared?: boolean
  langchainGraph?: any
  inputSchema?: any
  outputSchema?: any
  tags?: string[]
  category?: string
  version?: string
  isActive?: boolean
}

export interface ExecuteWorkflowInput {
  workflowTemplateId: string
  organizationId?: string
  userId: string
  input: Record<string, any>
  metadata?: {
    executionMode?: 'sync' | 'async'
    priority?: 'low' | 'normal' | 'high'
  }
}

export interface WorkflowExecutionStepInput {
  executionId: string
  stepName: string
  stepType?: string
  stepIndex: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  input?: any
  output?: any
  error?: string
  toolName?: string
  llmModel?: string
  tokensUsed?: string
  duration?: string
}

/**
 * Lista workflows disponíveis para o usuário/organização
 */
export async function listWorkflows(
  organizationId?: string,
  userId?: string,
  includeShared: boolean = true
) {
  const conditions = []

  if (organizationId) {
    if (includeShared) {
      // Workflows da org OU compartilhados OU globais
      conditions.push(
        or(
          eq(workflowTemplates.organizationId, organizationId),
          eq(workflowTemplates.isShared, true)
        )
      )
    } else {
      conditions.push(eq(workflowTemplates.organizationId, organizationId))
    }
  }

  conditions.push(eq(workflowTemplates.isActive, true))

  const workflows = await db
    .select()
    .from(workflowTemplates)
    .where(and(...conditions))
    .orderBy(desc(workflowTemplates.createdAt))

  return workflows
}

/**
 * Obtém um workflow por ID
 */
export async function getWorkflowById(id: string) {
  const workflows = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, id))
    .limit(1)

  return workflows[0] || null
}

/**
 * Cria um novo workflow template
 */
export async function createWorkflow(input: CreateWorkflowTemplateInput) {
  const [workflow] = await db
    .insert(workflowTemplates)
    .values({
      name: input.name,
      description: input.description,
      isShared: input.isShared || false,
      organizationId: input.organizationId || null,
      langchainGraph: input.langchainGraph,
      inputSchema: input.inputSchema || null,
      outputSchema: input.outputSchema || null,
      tags: input.tags || null,
      category: input.category || null,
      version: input.version || '1.0.0',
      createdBy: input.createdBy || null,
      isActive: true,
    })
    .returning()

  return workflow
}

/**
 * Atualiza um workflow template
 */
export async function updateWorkflow(id: string, input: UpdateWorkflowTemplateInput) {
  const [updated] = await db
    .update(workflowTemplates)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(workflowTemplates.id, id))
    .returning()

  return updated
}

/**
 * Deleta (desativa) um workflow template
 */
export async function deleteWorkflow(id: string) {
  const [deleted] = await db
    .update(workflowTemplates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(workflowTemplates.id, id))
    .returning()

  return deleted
}

/**
 * Cria uma execução de workflow
 */
export async function createExecution(input: ExecuteWorkflowInput) {
  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowTemplateId: input.workflowTemplateId,
      organizationId: input.organizationId || null,
      userId: input.userId,
      status: 'pending',
      input: input.input,
      metadata: input.metadata || null,
    })
    .returning()

  return execution
}

/**
 * Atualiza status de execução
 */
export async function updateExecutionStatus(
  executionId: string,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
  updates?: {
    output?: any
    error?: string
    errorStack?: string
    currentStep?: string
    totalSteps?: string
    progress?: string
    startedAt?: Date
    completedAt?: Date
  }
) {
  const [updated] = await db
    .update(workflowExecutions)
    .set({
      status,
      ...updates,
    })
    .where(eq(workflowExecutions.id, executionId))
    .returning()

  return updated
}

/**
 * Lista execuções de workflow
 */
export async function listExecutions(
  workflowTemplateId?: string,
  organizationId?: string,
  userId?: string,
  limit: number = 50
) {
  const conditions = []

  if (workflowTemplateId) {
    conditions.push(eq(workflowExecutions.workflowTemplateId, workflowTemplateId))
  }

  if (organizationId) {
    conditions.push(eq(workflowExecutions.organizationId, organizationId))
  }

  if (userId) {
    conditions.push(eq(workflowExecutions.userId, userId))
  }

  const query = db
    .select()
    .from(workflowExecutions)
    .orderBy(desc(workflowExecutions.createdAt))
    .limit(limit)

  if (conditions.length > 0) {
    return await query.where(and(...conditions))
  }

  return await query
}

/**
 * Obtém uma execução por ID
 */
export async function getExecutionById(id: string) {
  const executions = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, id))
    .limit(1)

  return executions[0] || null
}

/**
 * Adiciona step à execução
 */
export async function addExecutionStep(input: WorkflowExecutionStepInput) {
  const [step] = await db
    .insert(workflowExecutionSteps)
    .values({
      executionId: input.executionId,
      stepName: input.stepName,
      stepType: input.stepType || null,
      stepIndex: input.stepIndex,
      status: input.status,
      input: input.input || null,
      output: input.output || null,
      error: input.error || null,
      toolName: input.toolName || null,
      llmModel: input.llmModel || null,
      tokensUsed: input.tokensUsed || null,
      duration: input.duration || null,
      startedAt: new Date(),
      completedAt: input.status === 'completed' ? new Date() : null,
    })
    .returning()

  return step
}

/**
 * Atualiza step de execução
 */
export async function updateExecutionStep(
  stepId: string,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
  updates?: {
    output?: any
    error?: string
    completedAt?: Date
    duration?: string
  }
) {
  const [updated] = await db
    .update(workflowExecutionSteps)
    .set({
      status,
      ...updates,
    })
    .where(eq(workflowExecutionSteps.id, stepId))
    .returning()

  return updated
}

/**
 * Lista steps de uma execução
 */
export async function listExecutionSteps(executionId: string) {
  const steps = await db
    .select()
    .from(workflowExecutionSteps)
    .where(eq(workflowExecutionSteps.executionId, executionId))
    .orderBy(workflowExecutionSteps.stepIndex)

  return steps
}

