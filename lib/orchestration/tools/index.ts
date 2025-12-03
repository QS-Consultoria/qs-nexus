/**
 * LangChain Tools Registry
 * Exporta todas as tools disponíveis para workflows
 */

import { sqlQueryTool } from './sql-query-tool'
import { vectorSearchTool } from './vector-search-tool'
import { documentAnalysisTool } from './document-analysis-tool'
import { dataValidationTool } from './data-validation-tool'

/**
 * Registry de todas as tools disponíveis
 */
export const TOOLS_REGISTRY = {
  sql_query: sqlQueryTool,
  vector_search: vectorSearchTool,
  document_analysis: documentAnalysisTool,
  data_validation: dataValidationTool,
} as const

/**
 * Array de todas as tools (para uso com agentes)
 */
export const ALL_TOOLS = Object.values(TOOLS_REGISTRY)

/**
 * Obtém tool por nome
 */
export function getTool(name: string) {
  return TOOLS_REGISTRY[name as keyof typeof TOOLS_REGISTRY]
}

/**
 * Lista nomes de todas as tools
 */
export function listTools(): string[] {
  return Object.keys(TOOLS_REGISTRY)
}

/**
 * Exportações individuais
 */
export {
  sqlQueryTool,
  vectorSearchTool,
  documentAnalysisTool,
  dataValidationTool,
}

