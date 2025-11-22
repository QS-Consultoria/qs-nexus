import { db } from '../db/index'
import { templates, templateChunks, templateSchemaConfigs } from '../db/schema/rag'
import { TemplateDocument, toDynamicTemplateDocument } from '../types/template-document'
import { Chunk } from './chunker'
import { eq, and } from 'drizzle-orm'
import { loadTemplateSchemaConfig } from './template-schema-service'

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[]
}

/**
 * Armazena template no banco usando metadata JSONB
 */
export async function storeTemplate(
  template: TemplateDocument,
  documentFileId: string
): Promise<string> {
  // Busca schema config ativo (ou cria um padrão se não existir)
  let schemaConfigId: string | undefined
  try {
    const schemaConfig = await loadTemplateSchemaConfig()
    schemaConfigId = schemaConfig.id
  } catch (error) {
    // Se não houver schema ativo, tenta buscar o primeiro disponível
    console.warn('Nenhum schema ativo encontrado, tentando buscar primeiro disponível:', error)
    const schemas = await db
      .select()
      .from(templateSchemaConfigs)
      .limit(1)
    
    if (schemas.length > 0) {
      schemaConfigId = schemas[0].id
    }
  }

  // Converte para formato dinâmico com metadata JSONB
  const dynamicTemplate = toDynamicTemplateDocument(template, schemaConfigId)

  // Extrai campos para metadata JSONB
  const metadata = {
    docType: dynamicTemplate.docType,
    area: dynamicTemplate.area,
    jurisdiction: dynamicTemplate.jurisdiction || 'BR',
    complexity: dynamicTemplate.complexity,
    tags: dynamicTemplate.tags || [],
    summary: dynamicTemplate.summary,
    qualityScore: dynamicTemplate.qualityScore ?? null,
    isGold: dynamicTemplate.isGold || false,
    isSilver: dynamicTemplate.isSilver || false,
    // Preserva outros campos do metadata se houver
    ...(dynamicTemplate.metadata || {}),
  }

  const [inserted] = await db
    .insert(templates)
    .values({
      documentFileId,
      title: template.title,
      markdown: template.markdown,
      metadata: metadata as any,
      schemaConfigId: schemaConfigId || null,
    })
    .returning()

  return inserted.id
}

/**
 * Armazena chunks com embeddings no banco em batch
 */
export async function storeChunks(
  templateId: string,
  chunksWithEmbeddings: ChunkWithEmbedding[],
  batchSize: number = 500
): Promise<void> {
  // Insere em batches para melhor performance
  for (let i = 0; i < chunksWithEmbeddings.length; i += batchSize) {
    const batch = chunksWithEmbeddings.slice(i, i + batchSize)

    await db.insert(templateChunks).values(
      batch.map(chunk => ({
        templateId,
        section: chunk.section || null,
        role: chunk.role || null,
        contentMarkdown: chunk.content,
        chunkIndex: chunk.chunkIndex,
        embedding: chunk.embedding,
      }))
    )
  }
}

/**
 * Remove chunks de um template (para reprocessamento)
 */
export async function deleteTemplateChunks(templateId: string): Promise<void> {
  await db.delete(templateChunks).where(eq(templateChunks.templateId, templateId))
}

/**
 * Remove um template completo e todos os seus chunks (incluindo embeddings/vetores)
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  // Primeiro deleta todos os chunks (isso também deleta os embeddings/vetores)
  await deleteTemplateChunks(templateId)
  
  // Depois deleta o template
  await db.delete(templates).where(eq(templates.id, templateId))
}
