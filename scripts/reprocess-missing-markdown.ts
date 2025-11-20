import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { documentFiles } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import { readTemporaryMarkdown, resetFileStatus } from '../lib/services/file-tracker.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

dotenv.config({ path: '.env.local' });

const DOCX_SOURCE_DIR = process.env.DOCX_SOURCE_DIR || '../list-docx';
const PROJECT_ROOT = process.cwd();

async function main() {
  console.log('🔍 Verificando arquivos sem markdown temporário...\n');
  
  // Busca arquivos em processamento
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Total de arquivos em processamento: ${files.length}\n`);

  let withoutMarkdown = 0;
  let filesToReprocess: string[] = [];

  for (const file of files) {
    const markdown = readTemporaryMarkdown(file.fileHash);
    
    if (!markdown) {
      withoutMarkdown++;
      
      // Tenta encontrar o arquivo DOCX original
      const sourceDir = resolve(PROJECT_ROOT, DOCX_SOURCE_DIR);
      // Remove o prefixo ./ se existir
      const relativePath = file.filePath.replace(/^\.\//, '');
      const fullPath = resolve(sourceDir, relativePath);
      
      if (existsSync(fullPath)) {
        filesToReprocess.push(file.filePath);
      }
    }
  }

  console.log(`📊 Análise:`);
  console.log(`   ✗ Sem markdown temporário: ${withoutMarkdown}`);
  console.log(`   ✓ Arquivos DOCX encontrados para reprocessar: ${filesToReprocess.length}\n`);

  if (filesToReprocess.length > 0) {
    console.log('💡 Solução:');
    console.log('   Estes arquivos precisam ser reprocessados para gerar o markdown novamente.');
    console.log('   Execute: npm run rag:reprocess-missing\n');
    console.log(`   Ou reprocesse manualmente cada arquivo com:`);
    console.log(`   npm run rag:reprocess "./caminho/do/arquivo.docx"\n`);
  }
}

main().catch(console.error);

