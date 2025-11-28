/**
 * Exportação centralizada de Tools para agentes LangChain
 * QS Nexus - Sistema RAG Multi-tenant
 */

export { createSqlQueryTool } from './sql-query-tool'
export { createVectorSearchTool } from './vector-search-tool'
export { createDocumentAnalysisTool } from './document-analysis-tool'
export { createDataValidationTool } from './data-validation-tool'

/**
 * Cria todas as tools para um agente de uma organização específica
 */
export function createAllTools(organizationId: string) {
  return [
    createSqlQueryTool(organizationId),
    createVectorSearchTool(organizationId),
    createDocumentAnalysisTool(organizationId),
    createDataValidationTool(organizationId),
  ]
}

