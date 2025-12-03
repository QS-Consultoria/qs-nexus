/**
 * Vector Search Tool
 * Busca semântica em documentos e templates
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { searchSimilarChunks, SimilarChunk } from '@/lib/services/rag-search'

/**
 * Schema de input do tool
 */
const VectorSearchSchema = z.object({
  query: z.string().describe('Pergunta ou texto para buscar documentos similares'),
  organizationId: z.string().uuid().optional().describe('ID da organização para filtrar resultados'),
  limit: z.number().min(1).max(50).default(10).describe('Número máximo de resultados'),
  threshold: z.number().min(0).max(1).default(0.7).describe('Threshold de similaridade (0-1)'),
  filters: z.object({
    docType: z.string().optional().describe('Tipo de documento'),
    area: z.string().optional().describe('Área do direito'),
    dateFrom: z.string().optional().describe('Data inicial (YYYY-MM-DD)'),
    dateTo: z.string().optional().describe('Data final (YYYY-MM-DD)'),
  }).optional().describe('Filtros adicionais'),
})

/**
 * Formata resultados da busca
 */
function formatResults(chunks: SimilarChunk[]): string {
  if (chunks.length === 0) {
    return 'Nenhum documento relevante encontrado.'
  }

  const formatted = chunks.map((chunk, idx) => {
    return `
### Resultado ${idx + 1} (Similaridade: ${(chunk.similarity * 100).toFixed(1)}%)

**Arquivo**: ${chunk.fileName}
**Seção**: ${chunk.section || 'Não especificada'}
**Criado em**: ${new Date(chunk.createdAt).toLocaleDateString('pt-BR')}

**Conteúdo**:
${chunk.contentMarkdown.substring(0, 500)}${chunk.contentMarkdown.length > 500 ? '...' : ''}

---
`
  }).join('\n')

  return `Encontrados ${chunks.length} documentos relevantes:\n\n${formatted}`
}

/**
 * Tool para busca vetorial
 */
export const vectorSearchTool = new DynamicStructuredTool({
  name: 'vector_search',
  description: `Busca semântica em documentos jurídicos, contratos e templates usando similaridade vetorial.

Útil para:
- Encontrar documentos relacionados a um tópico
- Buscar precedentes ou modelos similares
- Recuperar informações contextuais de contratos
- Encontrar cláusulas específicas

A busca usa embeddings de IA para encontrar documentos semanticamente similares,
mesmo que não contenham as palavras exatas da query.`,
  
  schema: VectorSearchSchema,
  
  func: async ({ query, organizationId, limit, threshold, filters }) => {
    try {
      const chunks = await searchSimilarChunks(query, {
        limit,
        threshold,
        organizationId,
        ...(filters || {}),
      })

      const formattedResults = formatResults(chunks)

      return JSON.stringify({
        success: true,
        query,
        resultCount: chunks.length,
        results: formattedResults,
        rawChunks: chunks.map(c => ({
          fileName: c.fileName,
          section: c.section,
          similarity: c.similarity,
          preview: c.contentMarkdown.substring(0, 200),
        })),
      }, null, 2)
    } catch (error) {
      console.error('Erro na busca vetorial:', error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  },
})

/**
 * Helper para busca rápida (sem formatação)
 */
export async function quickSearch(
  query: string,
  organizationId?: string,
  limit: number = 5
): Promise<SimilarChunk[]> {
  return searchSimilarChunks(query, {
    limit,
    threshold: 0.7,
    organizationId,
  })
}

