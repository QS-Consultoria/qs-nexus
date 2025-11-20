import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { documentFiles, templates } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import { markFileCompleted } from '../lib/services/file-tracker.js';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔧 Corrigindo status de arquivos em "processing"...\n');
  
  // Busca arquivos em processamento
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Verificando ${files.length} arquivos...\n`);

  let fixed = 0;
  let skipped = 0;

  for (const file of files) {
    // Verifica se tem template
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.documentFileId, file.id))
      .limit(1);

    // Se tem template, deve estar como completed
    if (existingTemplate[0]) {
      await markFileCompleted(
        file.filePath,
        existingTemplate[0].id,
        file.wordsCount || 0
      );
      fixed++;
      if (fixed % 50 === 0) {
        console.log(`   ✓ Corrigidos: ${fixed}...`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Correção concluída:`);
  console.log(`   ✓ Corrigidos: ${fixed}`);
  console.log(`   ⊘ Sem template (mantidos em processing): ${skipped}`);
}

main().catch(console.error);

