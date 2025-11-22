import postgres from 'postgres'
import { generateEmbedding } from './embedding-generator'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables')
}

// Client postgres para queries SQL raw (necessário para operador <=> do pgvector)
const sqlClient = postgres(process.env.DATABASE_URL)

/**
 * Formata um array de números como string de vetor PostgreSQL
 * Exemplo: [1, 2, 3] -> "[1,2,3]"
 */
function formatVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

export interface SimilarChunk {
  id: string
  templateId: string
  contentMarkdown: string
  section: string | null
  role: string | null
  chunkIndex: number
  similarity: number
  templateTitle: string
  templateDocType: string
  templateArea: string
}

/**
 * Busca chunks similares a uma query usando busca vetorial
 * @param query Texto da query
 * @param limit Número máximo de chunks a retornar
 * @param minSimilarity Similaridade mínima (0-1, padrão 0.7)
 * @returns Lista de chunks similares ordenados por similaridade
 */
export async function searchSimilarChunks(
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.7
): Promise<SimilarChunk[]> {
  // Gera embedding da query
  const queryEmbedding = await generateEmbedding(query)
  
  // Formata o embedding como string de vetor PostgreSQL
  const vectorString = formatVector(queryEmbedding)

  // Busca chunks similares usando operador <=> (cosine distance)
  // Similaridade = 1 - (embedding <=> query_embedding)
  // Ordena por menor distância (maior similaridade)
  // Usa sql.unsafe para passar o vetor formatado corretamente
  // Extrai campos do metadata JSONB
  const results = await sqlClient.unsafe(
    `
    SELECT 
      tc.id,
      tc.template_id as "templateId",
      tc.content_markdown as "contentMarkdown",
      tc.section,
      tc.role,
      tc.chunk_index as "chunkIndex",
      1 - (tc.embedding <=> $1::vector) as similarity,
      t.title as "templateTitle",
      t.metadata->>'docType' as "templateDocType",
      t.metadata->>'area' as "templateArea"
    FROM template_chunks tc
    JOIN templates t ON t.id = tc.template_id
    WHERE tc.embedding IS NOT NULL
      AND 1 - (tc.embedding <=> $1::vector) >= $2
    ORDER BY tc.embedding <=> $1::vector
    LIMIT $3
    `,
    [vectorString, minSimilarity, limit]
  )

  return results.map((row: any) => ({
    id: row.id,
    templateId: row.templateId,
    contentMarkdown: row.contentMarkdown,
    section: row.section,
    role: row.role,
    chunkIndex: row.chunkIndex,
    similarity: parseFloat(row.similarity),
    templateTitle: row.templateTitle,
    templateDocType: row.templateDocType,
    templateArea: row.templateArea,
  }))
}

/**
 * Busca chunks similares com filtros adicionais
 * @param query Texto da query
 * @param options Opções de filtro
 * @returns Lista de chunks similares
 */
export async function searchSimilarChunksWithFilters(
  query: string,
  options: {
    limit?: number
    minSimilarity?: number
    area?: string
    docType?: string
    onlyGold?: boolean
  } = {}
): Promise<SimilarChunk[]> {
  const { limit = 10, minSimilarity = 0.7, area, docType, onlyGold = false } = options

  // Gera embedding da query
  const queryEmbedding = await generateEmbedding(query)
  
  // Formata o embedding como string de vetor PostgreSQL
  const vectorString = formatVector(queryEmbedding)

  // Constrói query SQL com filtros usando template literals do postgres
  // Usa sql.unsafe para queries complexas com pgvector
  let whereConditions = 'tc.embedding IS NOT NULL'
  const params: any[] = [vectorString, minSimilarity]

  // Filtros usando campos JSONB do metadata
  if (area) {
    whereConditions += ` AND t.metadata->>'area' = $${params.length + 1}`
    params.push(area)
  }

  if (docType) {
    whereConditions += ` AND t.metadata->>'docType' = $${params.length + 1}`
    params.push(docType)
  }

  if (onlyGold) {
    whereConditions += ` AND t.metadata->>'isGold' = 'true'`
  }

  params.push(limit)

  // Executa query SQL raw - usa campos JSONB do metadata
  const querySQL = `
    SELECT 
      tc.id,
      tc.template_id as "templateId",
      tc.content_markdown as "contentMarkdown",
      tc.section,
      tc.role,
      tc.chunk_index as "chunkIndex",
      1 - (tc.embedding <=> $1::vector) as similarity,
      t.title as "templateTitle",
      t.metadata->>'docType' as "templateDocType",
      t.metadata->>'area' as "templateArea"
    FROM template_chunks tc
    JOIN templates t ON t.id = tc.template_id
    WHERE ${whereConditions}
      AND 1 - (tc.embedding <=> $1::vector) >= $2
    ORDER BY tc.embedding <=> $1::vector
    LIMIT $${params.length}
  `

  const results = await sqlClient.unsafe(querySQL, params)

  return results.map((row: any) => ({
    id: row.id,
    templateId: row.templateId,
    contentMarkdown: row.contentMarkdown,
    section: row.section,
    role: row.role,
    chunkIndex: row.chunkIndex,
    similarity: parseFloat(row.similarity),
    templateTitle: row.templateTitle,
    templateDocType: row.templateDocType,
    templateArea: row.templateArea,
  }))
}
