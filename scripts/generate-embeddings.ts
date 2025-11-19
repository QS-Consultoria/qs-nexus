import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { templates, templateChunks } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import { chunkMarkdown } from '../lib/services/chunker.js';
import { generateEmbeddings } from '../lib/services/embedding-generator.js';
import { storeChunks } from '../lib/services/store-embeddings.js';

dotenv.config({ path: '.env.local' });

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '64');
const MAX_TOKENS = parseInt(process.env.CHUNK_MAX_TOKENS || '800');

async function main() {
  console.log('🔍 Gerando embeddings...');
  
  const allTemplates = await db.select().from(templates);
  
  console.log(`📄 Processando ${allTemplates.length} templates`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const template of allTemplates) {
    try {
      // Verifica se já tem chunks com embeddings
      const existingChunks = await db
        .select()
        .from(templateChunks)
        .where(eq(templateChunks.templateId, template.id))
        .limit(1);

      if (existingChunks.length > 0) {
        console.log(`✓ Já possui embeddings: ${template.id}`);
        skipped++;
        continue;
      }

      // Gera chunks
      const chunks = chunkMarkdown(template.markdown, MAX_TOKENS);
      
      if (chunks.length === 0) {
        console.log(`⚠️ Nenhum chunk gerado para: ${template.id}`);
        skipped++;
        continue;
      }

      // Gera embeddings em batch
      const texts = chunks.map(c => c.content);
      const embeddingResults = await generateEmbeddings(texts, BATCH_SIZE);

      // Combina chunks com embeddings
      const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
        ...chunk,
        embedding: embeddingResults[idx].embedding,
      }));

      // Armazena chunks com embeddings no banco
      await storeChunks(template.id, chunksWithEmbeddings);

      console.log(`✓ Embeddings gerados e armazenados: ${template.id} (${chunksWithEmbeddings.length} chunks)`);
      processed++;
      
    } catch (error) {
      console.error(`✗ Erro ao gerar embeddings para template ${template.id}:`, error);
      errors++;
    }
  }

  console.log(`\n✅ Geração de embeddings concluída:`);
  console.log(`   ✓ Processados: ${processed}`);
  console.log(`   ⊘ Pulados: ${skipped}`);
  console.log(`   ✗ Erros: ${errors}`);
}

main().catch(console.error);

