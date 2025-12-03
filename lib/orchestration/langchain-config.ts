/**
 * LangChain Configuration
 * Factory de LLMs e configurações centralizadas
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

export type LLMProvider = 'openai' | 'google'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

/**
 * Configurações de modelos disponíveis
 */
export const MODEL_CONFIGS = {
  // OpenAI Models
  'gpt-4o': {
    provider: 'openai' as const,
    maxTokens: 128000,
    contextWindow: 128000,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
  'gpt-4o-mini': {
    provider: 'openai' as const,
    maxTokens: 128000,
    contextWindow: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  'gpt-4-turbo': {
    provider: 'openai' as const,
    maxTokens: 128000,
    contextWindow: 128000,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  },
  // Google Models
  'gemini-2.0-flash-exp': {
    provider: 'google' as const,
    maxTokens: 8192,
    contextWindow: 1000000,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.0,
  },
  'gemini-1.5-flash': {
    provider: 'google' as const,
    maxTokens: 8192,
    contextWindow: 1000000,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
  },
  'gemini-1.5-pro': {
    provider: 'google' as const,
    maxTokens: 8192,
    contextWindow: 2000000,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
  },
}

/**
 * Cria instância de LLM baseado na configuração
 */
export function createLLM(config: LLMConfig): BaseChatModel {
  const {
    provider,
    model,
    temperature = 0.7,
    maxTokens,
    streaming = false,
  } = config

  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada')
    }

    return new ChatOpenAI({
      modelName: model,
      temperature,
      maxTokens,
      streaming,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })
  }

  if (provider === 'google') {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY não configurada')
    }

    return new ChatGoogleGenerativeAI({
      modelName: model,
      temperature,
      maxOutputTokens: maxTokens,
      streaming,
      apiKey: process.env.GOOGLE_AI_API_KEY,
    })
  }

  throw new Error(`Provider não suportado: ${provider}`)
}

/**
 * Obtém configuração do modelo
 */
export function getModelConfig(model: string) {
  return MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]
}

/**
 * Calcula custo estimado de uma execução
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = getModelConfig(model)
  if (!config) return 0

  const inputCost = (inputTokens / 1000) * config.costPer1kInput
  const outputCost = (outputTokens / 1000) * config.costPer1kOutput

  return inputCost + outputCost
}

/**
 * Valida se modelo está disponível
 */
export function isModelAvailable(model: string): boolean {
  return model in MODEL_CONFIGS
}

/**
 * Lista modelos disponíveis por provider
 */
export function listModels(provider?: LLMProvider): string[] {
  const models = Object.entries(MODEL_CONFIGS)
  
  if (provider) {
    return models
      .filter(([_, config]) => config.provider === provider)
      .map(([name]) => name)
  }

  return models.map(([name]) => name)
}

