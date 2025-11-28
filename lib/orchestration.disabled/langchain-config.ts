import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

/**
 * Configuração de LLMs para o sistema QS Nexus
 * Suporta OpenAI GPT-4 e Google Gemini com fallback
 */

export type LLMProvider = 'openai' | 'google'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

const DEFAULT_CONFIGS: Record<LLMProvider, LLMConfig> = {
  openai: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.1,
    maxTokens: 4096,
    streaming: true,
  },
  google: {
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.1,
    maxTokens: 4096,
    streaming: true,
  },
}

/**
 * Cria instância de LLM baseado no provider
 */
export function createLLM(
  provider: LLMProvider = 'openai',
  config?: Partial<LLMConfig>
): BaseChatModel {
  const fullConfig = { ...DEFAULT_CONFIGS[provider], ...config }

  switch (provider) {
    case 'openai': {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY não configurada')
      }

      return new ChatOpenAI({
        model: fullConfig.model,
        temperature: fullConfig.temperature,
        maxTokens: fullConfig.maxTokens,
        streaming: fullConfig.streaming,
        apiKey: process.env.OPENAI_API_KEY,
      })
    }

    case 'google': {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não configurada')
      }

      return new ChatGoogleGenerativeAI({
        model: fullConfig.model,
        temperature: fullConfig.temperature,
        maxOutputTokens: fullConfig.maxTokens,
        streaming: fullConfig.streaming,
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      })
    }

    default:
      throw new Error(`Provider não suportado: ${provider}`)
  }
}

/**
 * Cria LLM com fallback automático
 * Tenta OpenAI primeiro, se falhar usa Google
 */
export function createLLMWithFallback(config?: Partial<LLMConfig>): BaseChatModel {
  try {
    return createLLM('openai', config)
  } catch (error) {
    console.warn('OpenAI não disponível, usando Google Gemini:', error)
    return createLLM('google', config)
  }
}

/**
 * Rate limiter simples para controle de requisições
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []

    // Remove timestamps antigos
    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs)

    if (validTimestamps.length >= this.maxRequests) {
      return false
    }

    validTimestamps.push(now)
    this.requests.set(key, validTimestamps)
    return true
  }

  async waitForSlot(key: string): Promise<void> {
    while (!(await this.checkLimit(key))) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

// Instância global de rate limiter
export const globalRateLimiter = new RateLimiter(60, 60000)

