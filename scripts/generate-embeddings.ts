import * as dotenv from 'dotenv';
import { db } from '../lib/db/index.js';
import { templates, templateChunks } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';
import { chunkMarkdown } from '../lib/services/chunker.js';
import { generateEmbeddings } from '../lib/services/embedding-generator.js';
import { storeChunks } from '../lib/services/store-embeddings.js';
import { ConcurrencyPool, Task } from '../lib/utils/concurrency-pool.js';

dotenv.config({ path: '.env.local' });

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '64');
const MAX_TOKENS = parseInt(process.env.CHUNK_MAX_TOKENS || '800');
const EMBED_CONCURRENCY = parseInt(process.env.EMBED_CONCURRENCY || '2', 10);

interface EmbedResult {
  templateId: string;
  success: boolean;
  skipped?: boolean;
  chunksCount?: number;
}

/**
 * Gera embeddings para um template individual
 */
async function generateEmbeddingsTask(template: Awaited<ReturnType<typeof db.select<typeof templates>>>[0]): Promise<EmbedResult> {
  // Verifica se já tem chunks com embeddings
  const existingChunks = await db
    .select()
    .from(templateChunks)
    .where(eq(templateChunks.templateId, template.id))
    .limit(1);

  if (existingChunks.length > 0) {
    return {
      templateId: template.id,
      success: true,
      skipped: true,
    };
  }

  // Gera chunks
  const chunks = chunkMarkdown(template.markdown, MAX_TOKENS);
  
  if (chunks.length === 0) {
    return {
      templateId: template.id,
      success: true,
      skipped: true,
    };
  }

  // Gera embeddings em batch
  const texts = chunks.map(c => c.content);
  const embeddingResults = await generateEmbeddings(texts, BATCH_SIZE);

  // Combina chunks com embeddings
  const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
    ...chunk,
    embedding: embeddingResults[idx].embedding,
  }));

  // Armazena chunks com embeddings no banco
  await storeChunks(template.id, chunksWithEmbeddings);

  return {
    templateId: template.id,
    success: true,
    skipped: false,
    chunksCount: chunksWithEmbeddings.length,
  };
}

async function main() {
  console.log('🔍 Gerando embeddings...');
  
  const allTemplates = await db.select().from(templates);
  
  console.log(`📄 Processando ${allTemplates.length} templates`);
  console.log(`⚙️  Usando ${EMBED_CONCURRENCY} workers paralelos\n`);

  // Cria pool de concorrência
  const pool = new ConcurrencyPool<EmbedResult>({
    maxConcurrency: EMBED_CONCURRENCY,
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

  // Cria tarefas para cada template
  const tasks: Task<EmbedResult>[] = allTemplates.map((template) => ({
    id: `embed-${template.id}`,
    execute: () => generateEmbeddingsTask(template),
  }));

  pool.addBatch(tasks);

  // Processa todas as tarefas
  const startTime = Date.now();
  const results = await pool.processAll();
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Analisa resultados
  const processed = results.filter(r => r.success && !r.result?.skipped).length;
  const skipped = results.filter(r => r.success && r.result?.skipped).length;
  const errors = results.filter(r => !r.success).length;
  const totalChunks = results
    .filter(r => r.success && r.result?.chunksCount)
    .reduce((sum, r) => sum + (r.result?.chunksCount || 0), 0);

  console.log(`\n\n✅ Geração de embeddings concluída em ${duration}s`);
  console.log(`   ✓ Processados: ${processed}`);
  console.log(`   ⊘ Pulados: ${skipped}`);
  console.log(`   ✗ Erros: ${errors}`);
  if (totalChunks > 0) {
    console.log(`   📦 Total de chunks: ${totalChunks}`);
  }
}

main().catch(console.error);

