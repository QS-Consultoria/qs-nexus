import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { templates, templateChunks } from '../lib/db/schema/rag.js';
import { eq, isNull } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

/**
 * Script para verificar e completar chunks que foram criados sem embeddings.
 * Normalmente não é necessário executar este script, pois generate-embeddings.ts
 * já salva chunks com embeddings. Use apenas para casos de recuperação.
 */
async function main() {
  console.log('💾 Verificando chunks sem embeddings...');
  
  // Busca chunks sem embeddings
  const chunksWithoutEmbeddings = await db
    .select()
    .from(templateChunks)
    .where(isNull(templateChunks.embedding));

  console.log(`📄 Encontrados ${chunksWithoutEmbeddings.length} chunks sem embeddings`);

  if (chunksWithoutEmbeddings.length === 0) {
    console.log('✅ Todos os chunks já possuem embeddings!');
    return;
  }

  // Agrupa por template
  const templatesMap = new Map<string, typeof chunksWithoutEmbeddings>();
  for (const chunk of chunksWithoutEmbeddings) {
    if (!templatesMap.has(chunk.templateId)) {
      templatesMap.set(chunk.templateId, []);
    }
    templatesMap.get(chunk.templateId)!.push(chunk);
  }

  console.log(`⚠️ Encontrados ${templatesMap.size} templates com chunks sem embeddings`);
  console.log('   Execute "npm run rag:embed" para gerar embeddings para estes chunks');
}

main().catch(console.error);

