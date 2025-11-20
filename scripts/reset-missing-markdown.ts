import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { documentFiles, templates } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import { readTemporaryMarkdown, resetFileStatus } from '../lib/services/file-tracker.js';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔧 Resetando status de arquivos sem markdown temporário...\n');
  
  // Busca arquivos em processamento
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Verificando ${files.length} arquivos...\n`);

  let reset = 0;
  let skipped = 0;
  let withTemplate = 0;

  for (const file of files) {
    // Verifica se tem template
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.documentFileId, file.id))
      .limit(1);

    if (existingTemplate[0]) {
      // Se tem template, não reseta (será corrigido pelo classify corrigido)
      withTemplate++;
      continue;
    }

    // Verifica se tem markdown temporário
    const markdown = readTemporaryMarkdown(file.fileHash);
    
    if (!markdown) {
      // Sem markdown temporário e sem template - reseta para pending
      const success = await resetFileStatus(file.filePath);
      if (success) {
        reset++;
        if (reset % 50 === 0) {
          console.log(`   ✓ Resetados: ${reset}...`);
        }
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Reset concluído:`);
  console.log(`   ✓ Resetados para pending: ${reset}`);
  console.log(`   ⊘ Com markdown (mantidos): ${skipped}`);
  console.log(`   ⊘ Com template (serão corrigidos): ${withTemplate}\n`);
  
  if (reset > 0) {
    console.log('💡 Próximos passos:');
    console.log('   1. Execute: npm run rag:process (para gerar markdown novamente)');
    console.log('   2. Execute: npm run rag:classify (para classificar)');
    console.log('   3. Execute: npm run rag:embed (para gerar embeddings)\n');
  }
}

main().catch(console.error);

