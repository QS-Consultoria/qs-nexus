import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as dotenv from 'dotenv';
import {
  checkFileProcessed,
  markFileProcessing,
  calculateFileHash,
  normalizeFilePath,
  saveTemporaryMarkdown,
} from '../lib/services/file-tracker.js';
import { convertDocxToMarkdown, cleanMarkdown } from '../lib/services/docx-converter.js';
import { db } from '../lib/db/index.js';
import { documentFiles } from '../lib/db/schema/rag.js';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const DOCX_SOURCE_DIR = process.env.DOCX_SOURCE_DIR || '../list-docx';
const PROJECT_ROOT = process.cwd();

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

async function processDocument(filePath: string) {
  const normalizedPath = normalizeFilePath(filePath, PROJECT_ROOT);
  const fileHash = calculateFileHash(filePath);
  
  // Verifica se já foi processado
  const existing = await checkFileProcessed(normalizedPath, fileHash);
  if (existing && existing.status === 'completed') {
    console.log(`✓ Já processado: ${normalizedPath}`);
    return;
  }

  // Marca como processando (será atualizado novamente abaixo com wordCount)

  try {
    // Converte DOCX → Markdown
    const { markdown, wordCount } = await convertDocxToMarkdown(filePath);
    const cleanedMarkdown = cleanMarkdown(markdown);

    // Salva markdown temporário para uso na classificação
    saveTemporaryMarkdown(fileHash, cleanedMarkdown);

    // Atualiza wordCount no banco
    const fileInfo = await markFileProcessing(normalizedPath, fileHash, filePath.split('/').pop() || normalizedPath);
    await db
      .update(documentFiles)
      .set({
        wordsCount: wordCount,
        updatedAt: new Date(),
      })
      .where(eq(documentFiles.id, fileInfo.id));

    console.log(`✓ Processado: ${normalizedPath} (${wordCount} palavras)`);
    
    return {
      filePath: normalizedPath,
      fileHash,
      wordCount,
    };
  } catch (error) {
    console.error(`✗ Erro ao processar ${normalizedPath}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🔍 Procurando arquivos DOCX...');
  const sourceDir = resolve(PROJECT_ROOT, DOCX_SOURCE_DIR);
  const files = await findDocxFiles(sourceDir);
  
  console.log(`📄 Encontrados ${files.length} arquivos DOCX`);
  
  const results = [];
  for (const file of files) {
    try {
      const result = await processDocument(file);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Erro: ${error}`);
    }
  }

  console.log(`\n✅ Processamento concluído: ${results.length} arquivos processados`);
}

main().catch(console.error);

