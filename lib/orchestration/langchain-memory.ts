/**
 * LangChain Memory
 * Sistema de memória persistente para workflows e agentes
 */

import { BaseMessage } from '@langchain/core/messages'
import { BaseChatMessageHistory } from '@langchain/core/chat_history'

/**
 * Memória simples em memória (para POC)
 * TODO: Implementar memória persistente em banco de dados
 */
export class InMemoryChatHistory extends BaseChatMessageHistory {
  private messages: BaseMessage[] = []

  constructor(private sessionId: string) {
    super()
  }

  async getMessages(): Promise<BaseMessage[]> {
    return this.messages
  }

  async addMessage(message: BaseMessage): Promise<void> {
    this.messages.push(message)
  }

  async addMessages(messages: BaseMessage[]): Promise<void> {
    this.messages.push(...messages)
  }

  async clear(): Promise<void> {
    this.messages = []
  }
}

/**
 * Factory de memória
 */
export function createMemory(sessionId: string): InMemoryChatMessageHistory {
  return new InMemoryChatHistory(sessionId)
}

/**
 * TODO: Implementar PostgresChatHistory
 * 
 * Tabela sugerida:
 * CREATE TABLE workflow_memory (
 *   id UUID PRIMARY KEY,
 *   session_id UUID NOT NULL,
 *   organization_id UUID,
 *   message_type TEXT NOT NULL,
 *   content TEXT NOT NULL,
 *   metadata JSONB,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * Índices:
 * CREATE INDEX idx_workflow_memory_session ON workflow_memory(session_id);
 * CREATE INDEX idx_workflow_memory_org ON workflow_memory(organization_id);
 */

