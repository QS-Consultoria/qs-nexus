/**
 * Workflow Engine
 * Executa workflows usando grafos LangGraph
 */

import { createLLM, calculateCost } from './langchain-config'
import { getTool } from './tools'
import {
  updateExecutionStatus,
  addExecutionStep,
  WorkflowExecutionStepInput,
} from '@/lib/services/workflow-service'
import { processWorkflowNotification } from '@/lib/services/notification-service'

/**
 * Tipos de nodes suportados
 */
type NodeType = 'input' | 'output' | 'tool' | 'llm' | 'condition' | 'transform'

/**
 * Definição de node do grafo
 */
interface WorkflowNode {
  id: string
  type: NodeType
  tool?: string
  config: Record<string, any>
}

/**
 * Definição de edge (conexão)
 */
interface WorkflowEdge {
  source: string
  target: string
  condition?: string
}

/**
 * Grafo do workflow
 */
interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  entryPoint: string
}

/**
 * Contexto de execução
 */
interface ExecutionContext {
  executionId: string
  workflowName: string
  userId: string
  organizationId?: string
  input: Record<string, any>
  state: Record<string, any>
  stepIndex: number
}

/**
 * Resultado de execução
 */
interface ExecutionResult {
  success: boolean
  output?: any
  error?: string
  totalSteps: number
  tokensUsed: number
  cost: number
}

/**
 * Workflow Engine
 */
export class WorkflowEngine {
  private graph: WorkflowGraph
  private context: ExecutionContext

  constructor(graph: WorkflowGraph, context: ExecutionContext) {
    this.graph = graph
    this.context = context
  }

  /**
   * Executa o workflow completo
   */
  async execute(): Promise<ExecutionResult> {
    console.log(`[WorkflowEngine] Iniciando execução: ${this.context.executionId}`)

    let totalTokens = 0
    let totalCost = 0

    try {
      // Atualizar status para running
      await updateExecutionStatus(this.context.executionId, 'running', {
        startedAt: new Date(),
        totalSteps: this.graph.nodes.length.toString(),
        progress: '0',
      })

      // Inicializar state com input
      this.context.state = { ...this.context.input }

      // Encontrar node inicial
      const entryNode = this.graph.nodes.find(n => n.id === this.graph.entryPoint)
      if (!entryNode) {
        throw new Error(`Entry point não encontrado: ${this.graph.entryPoint}`)
      }

      // Executar a partir do entry point
      let currentNode: WorkflowNode | null = entryNode
      const visitedNodes = new Set<string>()

      while (currentNode) {
        // Proteção contra loops infinitos
        if (visitedNodes.has(currentNode.id)) {
          console.warn(`[WorkflowEngine] Loop detectado no node: ${currentNode.id}`)
          break
        }
        visitedNodes.add(currentNode.id)

        // Executar node atual
        const nodeResult = await this.executeNode(currentNode)
        
        // Atualizar tokens e custo
        if (nodeResult.tokens) {
          totalTokens += nodeResult.tokens
        }
        if (nodeResult.cost) {
          totalCost += nodeResult.cost
        }

        // Atualizar progresso
        const progress = Math.round((this.context.stepIndex / this.graph.nodes.length) * 100)
        await updateExecutionStatus(this.context.executionId, 'running', {
          progress: progress.toString(),
          currentStep: this.context.stepIndex.toString(),
        })

        // Se é output node, terminar
        if (currentNode.type === 'output') {
          break
        }

        // Encontrar próximo node
        currentNode = this.getNextNode(currentNode, nodeResult.output)
      }

      // Extrair output final do state
      const finalOutput = this.context.state

      // Atualizar status para completed
      await updateExecutionStatus(this.context.executionId, 'completed', {
        output: finalOutput,
        completedAt: new Date(),
        progress: '100',
      })

      // Notificar conclusão
      await processWorkflowNotification(
        this.context.userId,
        this.context.organizationId,
        this.context.workflowName,
        this.context.executionId,
        'completed',
        { output: finalOutput }
      )

      console.log(`[WorkflowEngine] Execução concluída: ${this.context.executionId}`)

      return {
        success: true,
        output: finalOutput,
        totalSteps: this.context.stepIndex,
        tokensUsed: totalTokens,
        cost: totalCost,
      }
    } catch (error) {
      console.error(`[WorkflowEngine] Erro na execução:`, error)

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

      // Atualizar status para failed
      await updateExecutionStatus(this.context.executionId, 'failed', {
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        completedAt: new Date(),
      })

      // Notificar falha
      await processWorkflowNotification(
        this.context.userId,
        this.context.organizationId,
        this.context.workflowName,
        this.context.executionId,
        'failed',
        { error: errorMessage }
      )

      return {
        success: false,
        error: errorMessage,
        totalSteps: this.context.stepIndex,
        tokensUsed: totalTokens,
        cost: totalCost,
      }
    }
  }

  /**
   * Executa um node individual
   */
  private async executeNode(node: WorkflowNode): Promise<{
    output: any
    tokens?: number
    cost?: number
  }> {
    console.log(`[WorkflowEngine] Executando node: ${node.id} (${node.type})`)

    this.context.stepIndex++

    const stepInput: WorkflowExecutionStepInput = {
      executionId: this.context.executionId,
      stepName: node.id,
      stepType: node.type,
      stepIndex: this.context.stepIndex.toString(),
      status: 'running',
      input: this.context.state,
    }

    const step = await addExecutionStep(stepInput)

    try {
      let output: any
      let tokens = 0
      let cost = 0

      switch (node.type) {
        case 'input':
          output = this.context.input
          break

        case 'output':
          output = this.context.state
          break

        case 'tool':
          if (!node.tool) {
            throw new Error('Tool não especificada no node')
          }
          const toolResult = await this.executeTool(node.tool, node.config)
          output = toolResult.output
          tokens = toolResult.tokens || 0
          cost = toolResult.cost || 0
          break

        case 'llm':
          const llmResult = await this.executeLLM(node.config)
          output = llmResult.output
          tokens = llmResult.tokens || 0
          cost = llmResult.cost || 0
          break

        case 'condition':
          output = this.evaluateCondition(node.config)
          break

        case 'transform':
          output = this.applyTransform(node.config)
          break

        default:
          throw new Error(`Tipo de node não suportado: ${node.type}`)
      }

      // Atualizar state
      if (node.config.outputKey) {
        this.context.state[node.config.outputKey] = output
      } else {
        this.context.state = { ...this.context.state, ...output }
      }

      // Marcar step como completed
      await addExecutionStep({
        executionId: this.context.executionId,
        stepName: node.id,
        stepType: node.type,
        stepIndex: this.context.stepIndex.toString(),
        status: 'completed',
        output,
        tokensUsed: tokens.toString(),
        duration: '0', // TODO: calcular duração real
      })

      return { output, tokens, cost }
    } catch (error) {
      console.error(`[WorkflowEngine] Erro no node ${node.id}:`, error)

      // Marcar step como failed
      await addExecutionStep({
        executionId: this.context.executionId,
        stepName: node.id,
        stepType: node.type,
        stepIndex: this.context.stepIndex.toString(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })

      throw error
    }
  }

  /**
   * Executa uma tool
   */
  private async executeTool(
    toolName: string,
    config: Record<string, any>
  ): Promise<{ output: any; tokens?: number; cost?: number }> {
    const tool = getTool(toolName)
    if (!tool) {
      throw new Error(`Tool não encontrada: ${toolName}`)
    }

    // Preparar input para a tool
    const toolInput = {
      ...config,
      organizationId: this.context.organizationId,
      ...this.context.state,
    }

    const result = await tool.invoke(toolInput)

    // Tentar parsear resultado como JSON
    try {
      const parsed = JSON.parse(result)
      return { output: parsed }
    } catch {
      return { output: result }
    }
  }

  /**
   * Executa LLM
   */
  private async executeLLM(
    config: Record<string, any>
  ): Promise<{ output: any; tokens?: number; cost?: number }> {
    const { provider = 'openai', model = 'gpt-4o-mini', prompt, temperature } = config

    const llm = createLLM({
      provider,
      model,
      temperature,
    })

    // Substituir variáveis no prompt
    let finalPrompt = prompt
    for (const [key, value] of Object.entries(this.context.state)) {
      finalPrompt = finalPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }

    const response = await llm.invoke(finalPrompt)

    // Estimativa de tokens (simplificada)
    const inputTokens = Math.ceil(finalPrompt.length / 4)
    const outputTokens = Math.ceil(response.content.toString().length / 4)
    const totalTokens = inputTokens + outputTokens

    const cost = calculateCost(model, inputTokens, outputTokens)

    return {
      output: response.content,
      tokens: totalTokens,
      cost,
    }
  }

  /**
   * Avalia condição
   */
  private evaluateCondition(config: Record<string, any>): any {
    // Implementação simples de condições
    // TODO: Adicionar avaliador mais robusto
    const { field, operator, value } = config

    const fieldValue = this.context.state[field]

    switch (operator) {
      case '==':
        return fieldValue == value
      case '!=':
        return fieldValue != value
      case '>':
        return fieldValue > value
      case '<':
        return fieldValue < value
      case '>=':
        return fieldValue >= value
      case '<=':
        return fieldValue <= value
      default:
        return false
    }
  }

  /**
   * Aplica transformação
   */
  private applyTransform(config: Record<string, any>): any {
    // Implementação simples de transformações
    // TODO: Adicionar transformações mais complexas
    const { type, sourceKey, targetKey } = config

    const value = this.context.state[sourceKey]

    switch (type) {
      case 'uppercase':
        return { [targetKey]: value?.toString().toUpperCase() }
      case 'lowercase':
        return { [targetKey]: value?.toString().toLowerCase() }
      case 'number':
        return { [targetKey]: Number(value) }
      case 'string':
        return { [targetKey]: String(value) }
      default:
        return { [targetKey]: value }
    }
  }

  /**
   * Obtém próximo node baseado em edges
   */
  private getNextNode(currentNode: WorkflowNode, output: any): WorkflowNode | null {
    const edges = this.graph.edges.filter(e => e.source === currentNode.id)

    if (edges.length === 0) {
      return null
    }

    // Se há condições, avaliar
    for (const edge of edges) {
      if (edge.condition) {
        const conditionMet = this.evaluateEdgeCondition(edge.condition, output)
        if (conditionMet) {
          return this.graph.nodes.find(n => n.id === edge.target) || null
        }
      }
    }

    // Pegar primeira edge sem condição
    const defaultEdge = edges.find(e => !e.condition)
    if (defaultEdge) {
      return this.graph.nodes.find(n => n.id === defaultEdge.target) || null
    }

    return null
  }

  /**
   * Avalia condição de edge
   */
  private evaluateEdgeCondition(condition: string, output: any): boolean {
    // Implementação simples
    // TODO: Adicionar parser de expressões mais robusto
    try {
      // Suporta condições simples como "output === true"
      return eval(condition)
    } catch {
      return false
    }
  }
}

