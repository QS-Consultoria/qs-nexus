import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { documentFiles } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import {
  markFileRejected,
  getFileByPath,
} from '../lib/services/file-tracker.js';

dotenv.config({ path: '.env.local' });

const MIN_WORDS = parseInt(process.env.MIN_WORDS || '300');
const MAX_WORDS = parseInt(process.env.MAX_WORDS || '25000');

async function filterDocument(filePath: string, wordCount: number) {
  const file = await getFileByPath(filePath);
  if (!file) {
    console.log(`⚠️ Arquivo não encontrado no tracking: ${filePath}`);
    return false;
  }

  if (wordCount < MIN_WORDS) {
    await markFileRejected(filePath, `Muito pequeno: ${wordCount} palavras (mínimo: ${MIN_WORDS})`);
    console.log(`✗ Rejeitado (muito pequeno): ${filePath}`);
    return false;
  }

  if (wordCount > MAX_WORDS) {
    await markFileRejected(filePath, `Muito grande: ${wordCount} palavras (máximo: ${MAX_WORDS})`);
    console.log(`✗ Rejeitado (muito grande): ${filePath}`);
    return false;
  }

  return true;
}

async function main() {
  console.log('🔍 Filtrando documentos...');
  
  // Busca arquivos em processamento
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Verificando ${files.length} arquivos`);

  let accepted = 0;
  let rejected = 0;

  for (const file of files) {
    if (file.wordsCount) {
      const acceptedFile = await filterDocument(file.filePath, file.wordsCount);
      if (acceptedFile) {
        accepted++;
      } else {
        rejected++;
      }
    }
  }

  console.log(`\n✅ Filtragem concluída:`);
  console.log(`   ✓ Aceitos: ${accepted}`);
  console.log(`   ✗ Rejeitados: ${rejected}`);
}

main().catch(console.error);

