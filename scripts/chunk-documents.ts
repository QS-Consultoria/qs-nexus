import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { templates, templateChunks } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import { chunkMarkdown } from '../lib/services/chunker.js';

dotenv.config({ path: '.env.local' });

const MAX_TOKENS = parseInt(process.env.CHUNK_MAX_TOKENS || '800');

/**
 * Script para análise e visualização de chunks.
 * Os chunks são gerados e salvos automaticamente em generate-embeddings.ts.
 * Use este script apenas para análise.
 */
async function main() {
  console.log('🔍 Analisando chunks de documentos...');
  
  const allTemplates = await db.select().from(templates);
  
  console.log(`📄 Encontrados ${allTemplates.length} templates\n`);

  let totalChunks = 0;
  let templatesWithChunks = 0;

  for (const template of allTemplates) {
    try {
      // Verifica chunks existentes no banco
      const existingChunks = await db
        .select()
        .from(templateChunks)
        .where(eq(templateChunks.templateId, template.id));

      if (existingChunks.length > 0) {
        templatesWithChunks++;
        totalChunks += existingChunks.length;
        console.log(`✓ ${template.title}: ${existingChunks.length} chunks no banco`);
        continue;
      }

      // Se não tem chunks, gera para análise (não salva)
      const chunks = chunkMarkdown(template.markdown, MAX_TOKENS);
      console.log(`⊘ ${template.title}: ${chunks.length} chunks (não salvos - execute rag:embed para salvar)`);
      
    } catch (error) {
      console.error(`✗ Erro ao analisar template ${template.id}:`, error);
    }
  }

  console.log(`\n✅ Análise concluída:`);
  console.log(`   Templates com chunks: ${templatesWithChunks}/${allTemplates.length}`);
  console.log(`   Total de chunks: ${totalChunks}`);
}

main().catch(console.error);

