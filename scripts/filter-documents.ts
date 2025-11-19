import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { documentFiles } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import {
  markFileRejected,
  getFileByPath,
} from '../lib/services/file-tracker.js';
import { ConcurrencyPool, Task } from '../lib/utils/concurrency-pool.js';

dotenv.config({ path: '.env.local' });

const MIN_WORDS = parseInt(process.env.MIN_WORDS || '300');
const MAX_WORDS = parseInt(process.env.MAX_WORDS || '25000');
const FILTER_CONCURRENCY = parseInt(process.env.FILTER_CONCURRENCY || '10', 10);

interface FilterResult {
  filePath: string;
  accepted: boolean;
  skipped?: boolean;
}

/**
 * Filtra um documento individual
 */
async function filterDocumentTask(file: Awaited<ReturnType<typeof db.select<typeof documentFiles>>>[0]): Promise<FilterResult> {
  if (!file.wordsCount) {
    return {
      filePath: file.filePath,
      accepted: false,
      skipped: true,
    };
  }

  const fileInfo = await getFileByPath(file.filePath);
  if (!fileInfo) {
    return {
      filePath: file.filePath,
      accepted: false,
      skipped: true,
    };
  }

  if (file.wordsCount < MIN_WORDS) {
    await markFileRejected(file.filePath, `Muito pequeno: ${file.wordsCount} palavras (mínimo: ${MIN_WORDS})`);
    return {
      filePath: file.filePath,
      accepted: false,
      skipped: false,
    };
  }

  if (file.wordsCount > MAX_WORDS) {
    await markFileRejected(file.filePath, `Muito grande: ${file.wordsCount} palavras (máximo: ${MAX_WORDS})`);
    return {
      filePath: file.filePath,
      accepted: false,
      skipped: false,
    };
  }

  return {
    filePath: file.filePath,
    accepted: true,
    skipped: false,
  };
}

async function main() {
  console.log('🔍 Filtrando documentos...');
  
  // Busca arquivos em processamento
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.status, 'processing'));

  console.log(`📄 Verificando ${files.length} arquivos`);
  console.log(`⚙️  Usando ${FILTER_CONCURRENCY} workers paralelos\n`);

  // Cria pool de concorrência
  const pool = new ConcurrencyPool<FilterResult>({
    maxConcurrency: FILTER_CONCURRENCY,
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
  const tasks: Task<FilterResult>[] = files.map((file) => ({
    id: `filter-${file.id}`,
    execute: () => filterDocumentTask(file),
  }));

  pool.addBatch(tasks);

  // Processa todas as tarefas
  const startTime = Date.now();
  const results = await pool.processAll();
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Analisa resultados
  const accepted = results.filter(r => r.success && r.result?.accepted).length;
  const rejected = results.filter(r => r.success && r.result && !r.result.accepted && !r.result.skipped).length;
  const skipped = results.filter(r => r.success && r.result?.skipped).length;
  const errors = results.filter(r => !r.success).length;

  console.log(`\n\n✅ Filtragem concluída em ${duration}s`);
  console.log(`   ✓ Aceitos: ${accepted}`);
  console.log(`   ✗ Rejeitados: ${rejected}`);
  if (skipped > 0) {
    console.log(`   ⊘ Pulados: ${skipped}`);
  }
  if (errors > 0) {
    console.log(`   ⚠️ Erros: ${errors}`);
  }
}

main().catch(console.error);

