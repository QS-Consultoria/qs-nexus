import { StateGraph, END } from '@langchain/langgraph'
import { BaseMessage } from '@langchain/core/messages'
import { db } from '@/lib/db'
import { workflowTemplates, workflowExecutions, workflowExecutionSteps } from '@/lib/db/schema/workflows'
import { eq } from 'drizzle-orm'
import { createLLMWithFallback } from './langchain-config'
import { createAllTools } from './tools'

/**
 * Workflow Engine para QS Nexus
 * Gerencia execução de workflows LangGraph com tenant isolation
 */

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  isShared: boolean
  organizationId: string | null
  langchainGraph: {
    nodes: Array<{
      id: string
      type: string
      config: Record<string, any>
    }>
    edges: Array<{
      source: string
      target: string
      condition?: string
    }>
    entryPoint: string
  }
  inputSchema?: any
  outputSchema?: any
}

export interface WorkflowExecution {
  id: string
  workflowTemplateId: string
  organizationId: string
  userId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  input?: any
  output?: any
  error?: string | null
  currentStep?: string | null
  progress?: string | null
  startedAt?: Date | null
  completedAt?: Date | null
}

export interface ExecutionOptions {
  mode?: 'sync' | 'async'
  priority?: 'low' | 'normal' | 'high'
  onProgress?: (step: string, progress: number) => void
}

/**
 * Workflow Engine principal
 */
export class WorkflowEngine {
  private organizationId: string
  private userId: string

  constructor(organizationId: string, userId: string) {
    this.organizationId = organizationId
    this.userId = userId
  }

  /**
   * Carrega template do banco
   */
  async loadTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, templateId))
      .limit(1)

    if (!template) {
      return null
    }

    // Verifica permissão: template global OU da própria org
    if (template.organizationId && template.organizationId !== this.organizationId) {
      if (!template.isShared) {
        throw new Error('Acesso negado a este workflow')
      }
    }

    return template as WorkflowTemplate
  }

  /**
   * Cria uma execução no banco
   */
  async createExecution(
    templateId: string,
    input: any,
    options?: ExecutionOptions
  ): Promise<WorkflowExecution> {
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowTemplateId: templateId,
        organizationId: this.organizationId,
        userId: this.userId,
        status: 'pending',
        input,
        metadata: {
          executionMode: options?.mode || 'async',
          priority: options?.priority || 'normal',
        },
      })
      .returning()

    return execution as WorkflowExecution
  }

  /**
   * Atualiza status da execução
   */
  async updateExecution(
    executionId: string,
    updates: Partial<WorkflowExecution>
  ): Promise<void> {
    await db
      .update(workflowExecutions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId))
  }

  /**
   * Registra step da execução
   */
  async logExecutionStep(
    executionId: string,
    stepData: {
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
    }
  ): Promise<void> {
    await db.insert(workflowExecutionSteps).values({
      executionId,
      ...stepData,
      completedAt: stepData.status === 'completed' || stepData.status === 'failed' ? new Date() : null,
    })
  }

  /**
   * Constrói grafo LangChain a partir do template
   */
  buildGraph(template: WorkflowTemplate, tools: any[]) {
    // Estado do workflow
    interface WorkflowState {
      messages: BaseMessage[]
      currentStep: string
      data: Record<string, any>
      result?: any
    }

    const workflow = new StateGraph<WorkflowState>({
      channels: {
        messages: {
          value: (prev: BaseMessage[], next: BaseMessage[]) => [...prev, ...next],
          default: () => [],
        },
        currentStep: {
          value: (prev: string, next: string) => next,
          default: () => '',
        },
        data: {
          value: (prev: Record<string, any>, next: Record<string, any>) => ({ ...prev, ...next }),
          default: () => ({}),
        },
        result: {
          value: (prev: any, next: any) => next,
          default: () => undefined,
        },
      },
    })

    // Adiciona nodes baseado no template
    for (const node of template.langchainGraph.nodes) {
      const nodeFunction = async (state: WorkflowState) => {
        const llm = createLLMWithFallback()

        // Lógica básica para diferentes tipos de node
        switch (node.type) {
          case 'llm': {
            const response = await llm.invoke(state.messages)
            return {
              messages: [response],
              currentStep: node.id,
            }
          }

          case 'tool': {
            const tool = tools.find((t) => t.name === node.config.toolName)
            if (tool) {
              const result = await tool.invoke(node.config.input || state.data)
              return {
                data: { ...state.data, [node.id]: result },
                currentStep: node.id,
              }
            }
            break
          }

          case 'end': {
            return {
              currentStep: 'END',
              result: state.data,
            }
          }

          default:
            return state
        }

        return state
      }

      workflow.addNode(node.id, nodeFunction)
    }

    // Adiciona edges
    for (const edge of template.langchainGraph.edges) {
      if (edge.condition) {
        // Conditional edge (simplified)
        workflow.addConditionalEdges(edge.source, (state: WorkflowState) => {
          // Evaluate condition (simplified - in production use proper expression parser)
          return edge.target
        })
      } else {
        workflow.addEdge(edge.source, edge.target)
      }
    }

    // Define entry point
    workflow.setEntryPoint(template.langchainGraph.entryPoint)

    // Define finish point
    workflow.setFinishPoint('end')

    return workflow.compile()
  }

  /**
   * Executa workflow
   */
  async executeWorkflow(
    templateId: string,
    input: any,
    options?: ExecutionOptions
  ): Promise<WorkflowExecution> {
    // 1. Carrega template
    const template = await this.loadTemplate(templateId)
    if (!template) {
      throw new Error('Workflow template não encontrado')
    }

    // 2. Cria execução
    const execution = await this.createExecution(templateId, input, options)

    try {
      // 3. Atualiza status para running
      await this.updateExecution(execution.id, {
        status: 'running',
        startedAt: new Date(),
      })

      // 4. Cria tools com tenant isolation
      const tools = createAllTools(this.organizationId)

      // 5. Constrói e executa grafo
      const graph = this.buildGraph(template, tools)

      const initialState = {
        messages: [],
        currentStep: '',
        data: input,
      }

      const result = await graph.invoke(initialState)

      // 6. Atualiza como completed
      await this.updateExecution(execution.id, {
        status: 'completed',
        output: result.result,
        completedAt: new Date(),
      })

      return {
        ...execution,
        status: 'completed',
        output: result.result,
      }
    } catch (error) {
      // Erro na execução
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

      await this.updateExecution(execution.id, {
        status: 'failed',
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        completedAt: new Date(),
      })

      throw error
    }
  }

  /**
   * Cancela execução em andamento
   */
  async cancelExecution(executionId: string): Promise<void> {
    // Verifica se a execução pertence à org
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1)

    if (!execution || execution.organizationId !== this.organizationId) {
      throw new Error('Execução não encontrada ou acesso negado')
    }

    await this.updateExecution(executionId, {
      status: 'cancelled',
      completedAt: new Date(),
    })
  }

  /**
   * Busca execuções da organização
   */
  async listExecutions(filters?: {
    templateId?: string
    status?: string
    limit?: number
  }): Promise<WorkflowExecution[]> {
    let query = db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.organizationId, this.organizationId))

    if (filters?.templateId) {
      query = query.where(eq(workflowExecutions.workflowTemplateId, filters.templateId))
    }

    if (filters?.status) {
      query = query.where(eq(workflowExecutions.status, filters.status as any))
    }

    const executions = await query
      .orderBy(workflowExecutions.createdAt)
      .limit(filters?.limit || 50)

    return executions as WorkflowExecution[]
  }
}

/**
 * Factory function para criar engine
 */
export function createWorkflowEngine(organizationId: string, userId: string): WorkflowEngine {
  return new WorkflowEngine(organizationId, userId)
}

