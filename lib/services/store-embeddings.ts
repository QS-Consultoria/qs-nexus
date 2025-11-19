import { db } from '../db/index.js';
import { templates, templateChunks } from '../db/schema/rag.js';
import { TemplateDocument } from '../types/template-document.js';
import { Chunk } from './chunker.js';
import { eq } from 'drizzle-orm';

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

/**
 * Armazena template no banco
 */
export async function storeTemplate(
  template: TemplateDocument,
  documentFileId: string
): Promise<string> {
  const [inserted] = await db
    .insert(templates)
    .values({
      documentFileId,
      title: template.title,
      docType: template.docType,
      area: template.area,
      jurisdiction: template.jurisdiction,
      complexity: template.complexity,
      tags: template.tags,
      summary: template.summary,
      markdown: template.markdown,
      metadata: template.metadata,
      qualityScore: template.qualityScore?.toString(),
      isGold: template.isGold,
      isSilver: template.isSilver,
    })
    .returning();

  return inserted.id;
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
    const batch = chunksWithEmbeddings.slice(i, i + batchSize);
    
    await db.insert(templateChunks).values(
      batch.map(chunk => ({
        templateId,
        section: chunk.section || null,
        role: chunk.role || null,
        contentMarkdown: chunk.content,
        chunkIndex: chunk.chunkIndex,
        embedding: chunk.embedding,
      }))
    );
  }
}

/**
 * Remove chunks de um template (para reprocessamento)
 */
export async function deleteTemplateChunks(templateId: string): Promise<void> {
  await db.delete(templateChunks).where(eq(templateChunks.templateId, templateId));
}

