import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { db } from '@/lib/db'
import { templateChunks, templates } from '@/lib/db/schema/rag'
import { sql, eq, and } from 'drizzle-orm'
import OpenAI from 'openai'

/**
 * Tool para busca semântica em documentos usando pgvector
 */

const VECTOR_SEARCH_SCHEMA = z.object({
  query: z.string().describe('Texto da busca semântica'),
  organizationId: z.string().uuid().describe('ID da organização'),
  limit: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Número de resultados a retornar (1-20)'),
  minSimilarity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Similaridade mínima (0-1)'),
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Gera embedding para o texto de busca
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  })

  return response.data[0].embedding
}

export function createVectorSearchTool(organizationId: string) {
  return new DynamicStructuredTool({
    name: 'search_documents',
    description: `Busca semântica em documentos fiscais e legais usando embeddings vetoriais.
    
    Use esta ferramenta para:
    - Encontrar documentos similares a uma descrição
    - Buscar cláusulas específicas em contratos
    - Localizar informações em documentos PDF/DOCX processados
    - Buscar por conceitos, não palavras exatas
    
    Exemplos:
    - "Cláusulas sobre penalidades por atraso"
    - "Informações sobre ICMS"
    - "Documentos relacionados a balanço patrimonial"
    - "Contratos de prestação de serviços contábeis"
    `,
    schema: VECTOR_SEARCH_SCHEMA,
    func: async ({ query, limit, minSimilarity }: z.infer<typeof VECTOR_SEARCH_SCHEMA>) => {
      try {
        // 1. Gerar embedding da query
        const queryEmbedding = await generateEmbedding(query)
        const embeddingStr = `[${queryEmbedding.join(',')}]`

        // 2. Buscar chunks similares com pgvector
        const results = await db.execute(sql`
          SELECT 
            tc.id,
            tc.section,
            tc.role,
            tc.content_markdown,
            tc.chunk_index,
            t.title,
            t.metadata,
            1 - (tc.embedding <=> ${embeddingStr}::vector) as similarity
          FROM ${templateChunks} tc
          JOIN ${templates} t ON tc.template_id = t.id
          WHERE t.organization_id = ${organizationId}
            AND tc.embedding IS NOT NULL
            AND 1 - (tc.embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
          ORDER BY tc.embedding <=> ${embeddingStr}::vector
          LIMIT ${limit}
        `)

        // 3. Formatar resultados
        const chunks = (results as any).rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          section: row.section,
          role: row.role,
          content: row.content_markdown,
          chunkIndex: row.chunk_index,
          similarity: parseFloat(row.similarity),
          metadata: row.metadata,
        }))

        return JSON.stringify({
          success: true,
          query,
          results: chunks,
          count: chunks.length,
        })
      } catch (error) {
        return JSON.stringify({
          error: error instanceof Error ? error.message : 'Erro na busca vetorial',
        })
      }
    },
  })
}

