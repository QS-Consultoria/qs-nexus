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
import { ConcurrencyPool, Task } from '../lib/utils/concurrency-pool.js';

dotenv.config({ path: '.env.local' });

const CLASSIFY_CONCURRENCY = parseInt(process.env.CLASSIFY_CONCURRENCY || '3', 10);

interface ClassifyResult {
  fileId: string;
  filePath: string;
  success: boolean;
  skipped?: boolean;
}

/**
 * Classifica um documento individual
 */
async function classifyDocumentTask(file: Awaited<ReturnType<typeof db.select<typeof documentFiles>>>[0]): Promise<ClassifyResult> {
  // Busca template existente (se houver)
  const existingTemplate = await db
    .select()
    .from(templates)
    .where(eq(templates.documentFileId, file.id))
    .limit(1);

  if (existingTemplate[0]) {
    return {
      fileId: file.id,
      filePath: file.filePath,
      success: true,
      skipped: true,
    };
  }

  // Lê markdown temporário
  const markdown = readTemporaryMarkdown(file.fileHash);
  if (!markdown) {
    return {
      fileId: file.id,
      filePath: file.filePath,
      success: true,
      skipped: true,
    };
  }

  // Classifica o documento
  const classification = await classifyDocument(markdown);
  
  // Cria TemplateDocument
  const templateDoc = createTemplateDocument(classification, markdown, file.id);
  
  // Armazena template no banco
  const templateId = await storeTemplate(templateDoc, file.id);
  
  // Marca arquivo como completo
  await markFileCompleted(file.filePath, templateId, file.wordsCount || 0);
  
  // Remove markdown temporário
  removeTemporaryMarkdown(file.fileHash);
  
  return {
    fileId: file.id,
    filePath: file.filePath,
    success: true,
    skipped: false,
  };
}

async function main() {
  console.log('🔍 Classificando documentos...');
  
  // Busca arquivos processados mas não classificados
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Encontrados ${files.length} arquivos para classificar`);
  console.log(`⚙️  Usando ${CLASSIFY_CONCURRENCY} workers paralelos\n`);

  // Cria pool de concorrência
  const pool = new ConcurrencyPool<ClassifyResult>({
    maxConcurrency: CLASSIFY_CONCURRENCY,
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    onProgress: (stats) => {
      const progress = stats.total > 0 
        ? Math.round((stats.completed / stats.total) * 100) 
        : 0;
      process.stdout.write(
        `\r📊 Progresso: ${stats.completed}/${stats.total} (${progress}%) | ` +
        `Em processamento: ${stats.inProgress} | Falhas: ${stats.failed}`
      );
    },
  });

  // Cria tarefas para cada arquivo
  const tasks: Task<ClassifyResult>[] = files.map((file) => ({
    id: `classify-${file.id}`,
    execute: () => classifyDocumentTask(file),
  }));

  pool.addBatch(tasks);

  // Processa todas as tarefas
  const startTime = Date.now();
  const results = await pool.processAll();
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Analisa resultados
  const classified = results.filter(r => r.success && !r.result?.skipped).length;
  const skipped = results.filter(r => r.success && r.result?.skipped).length;
  const errors = results.filter(r => !r.success).length;

  console.log(`\n\n✅ Classificação concluída em ${duration}s`);
  console.log(`   ✓ Classificados: ${classified}`);
  console.log(`   ⊘ Pulados: ${skipped}`);
  console.log(`   ✗ Erros: ${errors}`);
}

main().catch(console.error);

