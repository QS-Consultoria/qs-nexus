import postgres from 'postgres'
import { generateEmbedding } from './embedding-generator'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables')
}

// Client postgres para queries SQL raw (necessário para operador <=> do pgvector)
const sqlClient = postgres(process.env.DATABASE_URL)

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

  // Busca chunks similares usando operador <=> (cosine distance)
  // Similaridade = 1 - (embedding <=> query_embedding)
  // Ordena por menor distância (maior similaridade)
  const results = await sqlClient`
    SELECT 
      tc.id,
      tc.template_id as "templateId",
      tc.content_markdown as "contentMarkdown",
      tc.section,
      tc.role,
      tc.chunk_index as "chunkIndex",
      1 - (tc.embedding <=> ${queryEmbedding}::vector) as similarity,
      t.title as "templateTitle",
      t.doc_type as "templateDocType",
      t.area as "templateArea"
    FROM template_chunks tc
    JOIN templates t ON t.id = tc.template_id
    WHERE tc.embedding IS NOT NULL
      AND 1 - (tc.embedding <=> ${queryEmbedding}::vector) >= ${minSimilarity}
    ORDER BY tc.embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `

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

  // Constrói query SQL com filtros usando template literals do postgres
  // Usa sql.unsafe para queries complexas com pgvector
  let whereConditions = 'tc.embedding IS NOT NULL'
  const params: any[] = [queryEmbedding, minSimilarity]

  if (area) {
    whereConditions += ` AND t.area = $${params.length + 1}`
    params.push(area)
  }

  if (docType) {
    whereConditions += ` AND t.doc_type = $${params.length + 1}`
    params.push(docType)
  }

  if (onlyGold) {
    whereConditions += ' AND t.is_gold = true'
  }

  params.push(limit)

  // Executa query SQL raw
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
      t.doc_type as "templateDocType",
      t.area as "templateArea"
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
