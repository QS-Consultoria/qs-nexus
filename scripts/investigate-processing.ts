import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { documentFiles, templates } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import { readTemporaryMarkdown } from '../lib/services/file-tracker.js';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔍 Investigando arquivos em status "processing"...\n');
  
  // Busca arquivos em processamento
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Total de arquivos em processamento: ${files.length}\n`);

  let withTemplate = 0;
  let withoutMarkdown = 0;
  let withMarkdown = 0;
  let withoutTemplateAndMarkdown = 0;
  let withWordsCount = 0;
  let withoutWordsCount = 0;
  let rejectedByFilter = 0;

  const MIN_WORDS = parseInt(process.env.MIN_WORDS || '300');
  const MAX_WORDS = parseInt(process.env.MAX_WORDS || '25000');

  for (const file of files) {
    // Verifica se tem template
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.documentFileId, file.id))
      .limit(1);

    // Verifica se tem markdown temporário
    const markdown = readTemporaryMarkdown(file.fileHash);

    if (existingTemplate[0]) {
      withTemplate++;
    }

    if (!markdown) {
      withoutMarkdown++;
    } else {
      withMarkdown++;
    }

    if (!existingTemplate[0] && !markdown) {
      withoutTemplateAndMarkdown++;
    }

    if (file.wordsCount) {
      withWordsCount++;
      // Verifica se seria rejeitado pelo filter
      if (file.wordsCount < MIN_WORDS || file.wordsCount > MAX_WORDS) {
        rejectedByFilter++;
      }
    } else {
      withoutWordsCount++;
    }
  }

  console.log('📊 Análise:');
  console.log(`   ✓ Com template: ${withTemplate}`);
  console.log(`   ✓ Com markdown temporário: ${withMarkdown}`);
  console.log(`   ✗ Sem markdown temporário: ${withoutMarkdown}`);
  console.log(`   ⚠️  Sem template E sem markdown: ${withoutTemplateAndMarkdown}\n`);
  
  console.log('📊 Análise de palavras:');
  console.log(`   ✓ Com wordCount: ${withWordsCount}`);
  console.log(`   ✗ Sem wordCount: ${withoutWordsCount}`);
  console.log(`   ⚠️  Seriam rejeitados pelo filter: ${rejectedByFilter} (MIN: ${MIN_WORDS}, MAX: ${MAX_WORDS})\n`);

  // Arquivos com template mas ainda em processing (devem ser marcados como completed)
  if (withTemplate > 0) {
    console.log('💡 Solução: Arquivos com template devem ser marcados como "completed"');
    console.log('   Execute: npm run rag:fix-status\n');
  }

  // Arquivos sem markdown e sem template - provavelmente precisam ser reprocessados ou rejeitados
  if (withoutTemplateAndMarkdown > 0) {
    console.log('💡 Possíveis problemas:');
    console.log('   - Arquivos sem markdown temporário e sem template');
    console.log('   - Podem ter sido processados mas o markdown foi removido antes da classificação');
    console.log('   - Ou podem ter falhado na classificação\n');
  }
}

main().catch(console.error);
