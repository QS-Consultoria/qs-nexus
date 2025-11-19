import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { documentFiles, templates } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import {
  classifyDocument,
  createTemplateDocument,
} from '../lib/services/classifier.js';
import { storeTemplate } from '../lib/services/store-embeddings.js';
import {
  readTemporaryMarkdown,
  removeTemporaryMarkdown,
  markFileCompleted,
} from '../lib/services/file-tracker.js';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔍 Classificando documentos...');
  
  // Busca arquivos processados mas não classificados
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Encontrados ${files.length} arquivos para classificar`);

  let classified = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    try {
      // Busca template existente (se houver)
      const existingTemplate = await db
        .select()
        .from(templates)
        .where(eq(templates.documentFileId, file.id))
        .limit(1);

      if (existingTemplate[0]) {
        console.log(`✓ Já classificado: ${file.filePath}`);
        skipped++;
        continue;
      }

      // Lê markdown temporário
      const markdown = readTemporaryMarkdown(file.fileHash);
      if (!markdown) {
        console.log(`⚠️ Markdown não encontrado para ${file.filePath} - pulando`);
        skipped++;
        continue;
      }

      // Classifica o documento
      console.log(`🔍 Classificando: ${file.filePath}...`);
      const classification = await classifyDocument(markdown);
      
      // Cria TemplateDocument
      const templateDoc = createTemplateDocument(classification, markdown, file.id);
      
      // Armazena template no banco
      const templateId = await storeTemplate(templateDoc, file.id);
      
      // Marca arquivo como completo
      await markFileCompleted(file.filePath, templateId, file.wordsCount || 0);
      
      // Remove markdown temporário
      removeTemporaryMarkdown(file.fileHash);
      
      console.log(`✓ Classificado: ${file.filePath} (${classification.docType}, ${classification.area}, qualidade: ${classification.qualityScore})`);
      classified++;
      
    } catch (error) {
      console.error(`✗ Erro ao classificar ${file.filePath}:`, error);
      errors++;
    }
  }

  console.log(`\n✅ Classificação concluída:`);
  console.log(`   ✓ Classificados: ${classified}`);
  console.log(`   ⊘ Pulados: ${skipped}`);
  console.log(`   ✗ Erros: ${errors}`);
}

main().catch(console.error);

