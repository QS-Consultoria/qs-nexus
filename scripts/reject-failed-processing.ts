import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { documentFiles, templates } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import { readTemporaryMarkdown, markFileRejected } from '../lib/services/file-tracker.js';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔧 Marcando como rejeitados arquivos em "processing" que falharam...\n');
  
  // Busca arquivos em processamento
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Verificando ${files.length} arquivos...\n`);

  let rejectedNoMarkdown = 0;
  let rejectedFailedClassify = 0;
  let skipped = 0;
  let withTemplate = 0;
  let withMarkdown = 0;

  for (const file of files) {
    // Verifica se tem template
    const existingTemplate = await db
      .select()
      .from(templates)
      .where(eq(templates.documentFileId, file.id))
      .limit(1);

    if (existingTemplate[0]) {
      // Se tem template, não marca como rejeitado (será corrigido pelo classify)
      withTemplate++;
      continue;
    }

    // Verifica se tem markdown temporário
    const markdown = readTemporaryMarkdown(file.fileHash);
    
    if (!markdown) {
      // Sem markdown temporário - falhou no processamento
      try {
        await markFileRejected(
          file.filePath,
          'Falhou no processamento: arquivo ficou em status "processing" sem markdown temporário gerado. Provavelmente erro na conversão DOCX para Markdown.'
        );
        rejectedNoMarkdown++;
        if ((rejectedNoMarkdown + rejectedFailedClassify) % 10 === 0) {
          console.log(`   ✓ Rejeitados: ${rejectedNoMarkdown + rejectedFailedClassify}...`);
        }
      } catch (error) {
        console.error(`   ❌ Erro ao marcar como rejeitado: ${file.fileName}`);
        console.error(`      Erro: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Tem markdown mas não tem template - falhou na classificação
      // Marca como rejeitado porque já tentou classificar e falhou
      try {
        await markFileRejected(
          file.filePath,
          'Falhou na classificação: arquivo tem markdown temporário mas não foi classificado com sucesso após múltiplas tentativas.'
        );
        rejectedFailedClassify++;
        if ((rejectedNoMarkdown + rejectedFailedClassify) % 10 === 0) {
          console.log(`   ✓ Rejeitados: ${rejectedNoMarkdown + rejectedFailedClassify}...`);
        }
      } catch (error) {
        console.error(`   ❌ Erro ao marcar como rejeitado: ${file.fileName}`);
        console.error(`      Erro: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const totalRejected = rejectedNoMarkdown + rejectedFailedClassify;

  console.log(`\n✅ Processo concluído:`);
  console.log(`   ✗ Marcados como rejeitados: ${totalRejected}`);
  console.log(`      - Sem markdown (falhou no processamento): ${rejectedNoMarkdown}`);
  console.log(`      - Com markdown mas sem template (falhou na classificação): ${rejectedFailedClassify}`);
  console.log(`   ⊘ Com template (serão corrigidos): ${withTemplate}\n`);
  
  if (totalRejected > 0) {
    console.log('💡 Arquivos rejeitados não serão mais processados automaticamente.');
    console.log('   Se quiser tentar processar novamente, use: npm run rag:reprocess "./caminho/do/arquivo.docx"\n');
  }
}

main().catch(console.error);

