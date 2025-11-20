import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import {
  checkFileProcessed,
  markFileProcessing,
  markFileRejected,
  calculateFileHash,
  normalizeFilePath,
  saveTemporaryMarkdown,
  readTemporaryMarkdown,
} from '../lib/services/file-tracker.js';
import { cleanMarkdown } from '../lib/services/docx-converter.js';
import { ConcurrencyPool, Task } from '../lib/utils/concurrency-pool.js';
import { db } from '../lib/db/index.js';
import { documentFiles } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const DOCX_SOURCE_DIR = process.env.DOCX_SOURCE_DIR || '../list-docx';
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '6', 10);
const PROJECT_ROOT = process.cwd();

// Caminho do worker thread
const WORKER_PATH = fileURLToPath(new URL('../lib/workers/docx-converter-worker.ts', import.meta.url));

async function findDocxFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...await findDocxFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.docx')) {
      files.push(fullPath);
    }
  }

  return files;
}

interface ProcessResult {
  filePath: string;
  fileHash: string;
  wordCount: number;
}

/**
 * Converte DOCX para Markdown usando Worker Thread
 */
function convertDocxWithWorker(filePath: string): Promise<{ markdown: string; wordCount: number }> {
  return new Promise((resolve, reject) => {
    const taskId = `${Date.now()}-${Math.random()}`;
    const DEBUG = process.env.DEBUG === 'true';
    
    try {
      // Usa tsx para executar o worker TypeScript
      // Node.js 20.6+ requer --import ao invés de --loader
      const execArgv = process.execArgv.length > 0 
        ? process.execArgv 
        : ['--import', 'tsx/esm'];
      const worker = new Worker(WORKER_PATH, { execArgv });

      const timeout = setTimeout(() => {
        if (DEBUG) console.error(`[WORKER] Timeout para: ${filePath}`);
        worker.terminate();
        reject(new Error('Worker timeout após 60s'));
      }, 60000); // 60 segundos timeout

      worker.on('message', (message: { taskId: string; success: boolean; result?: any; error?: string }) => {
        if (message.taskId !== taskId) {
          if (DEBUG) console.error(`[WORKER] TaskId mismatch: esperado ${taskId}, recebido ${message.taskId}`);
          return; // Ignora mensagens de outras tarefas
        }
        
        clearTimeout(timeout);
        worker.terminate();

        if (message.success && message.result) {
          resolve(message.result);
        } else {
          console.error(`[WORKER] Erro na conversão: ${message.error} - ${filePath}`);
          reject(new Error(message.error || 'Unknown error'));
        }
      });

      worker.on('error', (error) => {
        console.error(`[WORKER] Erro no worker: ${error.message} - ${filePath}`);
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      });

      worker.on('exit', (code) => {
        // Ignora exit code 1 se já recebemos a mensagem (worker pode terminar com código de erro mesmo após sucesso)
        // Só rejeita se não recebemos mensagem de sucesso
        if (code !== 0 && DEBUG) {
          console.error(`[WORKER] Worker exit code ${code} para: ${filePath}`);
        }
      });

      worker.postMessage({ filePath, taskId });
    } catch (error) {
      console.error(`[WORKER] Erro ao criar worker: ${error instanceof Error ? error.message : String(error)} - ${filePath}`);
      reject(error);
    }
  });
}

/**
 * Verifica se o erro indica que o arquivo está corrompido ou inválido
 */
function isFileCorruptionError(error: Error | string): boolean {
  const errorMsg = typeof error === 'string' ? error : error.message;
  const lowerMsg = errorMsg.toLowerCase();
  
  // Padrões de erro que indicam arquivo corrompido/inválido
  return (
    lowerMsg.includes('could not find the body element') ||
    lowerMsg.includes('corrupted zip') ||
    lowerMsg.includes("can't find end of central directory") ||
    lowerMsg.includes('end of data reached') ||
    lowerMsg.includes('is this a docx file') ||
    lowerMsg.includes('is this a zip file')
  );
}

/**
 * Processa um documento individual
 */
async function processDocument(filePath: string): Promise<ProcessResult | null> {
  const normalizedPath = normalizeFilePath(filePath, PROJECT_ROOT);
  const fileName = filePath.split('/').pop() || normalizedPath;
  const DEBUG = process.env.DEBUG === 'true';
  
  try {
    if (DEBUG) console.error(`[PROCESS] Iniciando: ${fileName}`);
    const fileHash = calculateFileHash(filePath);
    
    // Verifica se já foi processado ou rejeitado
    const existing = await checkFileProcessed(normalizedPath, fileHash);
    if (existing) {
      if (existing.status === 'completed') {
        return null; // Já processado, pula
      }
      if (existing.status === 'rejected') {
        return null; // Já rejeitado, pula
      }
      // Se está como "processing" mas não tem markdown temporário, 
      // significa que falhou anteriormente - vamos tentar processar novamente
      if (existing.status === 'processing') {
        const existingMarkdown = readTemporaryMarkdown(existing.fileHash);
        if (!existingMarkdown) {
          if (DEBUG) console.error(`[PROCESS] Arquivo em processing sem markdown, tentando novamente: ${fileName}`);
          // Continua para tentar processar novamente
        } else {
          // Tem markdown, já foi processado com sucesso, apenas atualiza status se necessário
          return null;
        }
      }
    }

    // Converte DOCX → Markdown usando Worker Thread
    const { markdown, wordCount } = await convertDocxWithWorker(filePath);
    const cleanedMarkdown = cleanMarkdown(markdown);

    // Salva markdown temporário para uso na classificação
    saveTemporaryMarkdown(fileHash, cleanedMarkdown);

    // Atualiza wordCount no banco
    const fileInfo = await markFileProcessing(normalizedPath, fileHash, fileName);
    await db
      .update(documentFiles)
      .set({
        wordsCount: wordCount,
        updatedAt: new Date(),
      })
      .where(eq(documentFiles.id, fileInfo.id));

    if (DEBUG) console.error(`[PROCESS] Sucesso: ${fileName}`);
    return {
      filePath: normalizedPath,
      fileHash,
      wordCount,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[PROCESS] ERRO em ${fileName}: ${errorMsg}`);
    
    if (DEBUG && error instanceof Error) {
      console.error(`[PROCESS] Stack: ${error.stack}`);
    }
    
    // IMPORTANTE: Não marca como rejeitado aqui, deixa o onTaskFailed fazer isso
    // após todas as tentativas de retry serem esgotadas
    throw new Error(`Erro ao processar ${normalizedPath}: ${errorMsg}`);
  }
}

async function main() {
  console.log('🔍 Procurando arquivos DOCX...');
  const sourceDir = resolve(PROJECT_ROOT, DOCX_SOURCE_DIR);
  const files = await findDocxFiles(sourceDir);
  
  console.log(`📄 Encontrados ${files.length} arquivos DOCX`);
  console.log(`⚙️  Usando ${WORKER_CONCURRENCY} workers paralelos\n`);

  // Cria pool de concorrência
  const pool = new ConcurrencyPool<ProcessResult | null>({
    maxConcurrency: WORKER_CONCURRENCY,
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
    onTaskFailed: async (taskId, errorMessage) => {
      // Extrai o filePath do taskId (formato: file-{index}-{filePath})
      const match = taskId.match(/^file-\d+-(.+)$/);
      if (match) {
        const filePath = match[1];
        const normalizedPath = normalizeFilePath(filePath, PROJECT_ROOT);
        
        // Marca TODOS os erros como rejeitados (não apenas corrupção)
        // Arquivos que falharam após todas as tentativas não devem ser reprocessados
        try {
          await markFileRejected(normalizedPath, errorMessage);
          const fileName = filePath.split('/').pop() || normalizedPath;
          console.error(`[POOL] ✅ Arquivo marcado como rejeitado: ${fileName}`);
          console.error(`[POOL]    Motivo: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`);
        } catch (rejectError) {
          const fileName = filePath.split('/').pop() || normalizedPath;
          console.error(`[POOL] ❌ ERRO ao marcar como rejeitado: ${fileName}`);
          console.error(`[POOL]    Erro: ${rejectError instanceof Error ? rejectError.message : String(rejectError)}`);
          if (process.env.DEBUG === 'true' && rejectError instanceof Error) {
            console.error(`[POOL]    Stack: ${rejectError.stack}`);
        }
        }
      } else {
        console.error(`[POOL] ⚠️  Não foi possível extrair filePath do taskId: ${taskId}`);
      }
    },
  });

  // Cria tarefas para cada arquivo
  const tasks: Task<ProcessResult | null>[] = files.map((filePath, index) => ({
    id: `file-${index}-${filePath}`,
    execute: () => processDocument(filePath),
  }));

  pool.addBatch(tasks);

  // Processa todas as tarefas
  const startTime = Date.now();
  const results = await pool.processAll();
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Filtra resultados válidos (não nulos)
  const validResults = results.filter(r => r.success && r.result !== null);

  console.log(`\n\n✅ Processamento concluído em ${duration}s`);
  console.log(`   ✓ Processados: ${validResults.length}`);
  console.log(`   ✗ Falhas: ${results.filter(r => !r.success).length}`);
  console.log(`   ⊘ Já processados: ${results.length - validResults.length - results.filter(r => !r.success).length}`);
}

main().catch(console.error);

