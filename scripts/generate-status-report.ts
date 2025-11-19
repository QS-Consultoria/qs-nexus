import * as dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
import { getProcessingStatus, getRejectedFiles } from '../lib/services/file-tracker.js';
import { db } from '../lib/db/index.js';
import { documentFiles } from '../lib/db/schema/rag.js';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('📊 Gerando relatório de status...');

  const status = await getProcessingStatus();
  const allFiles = await db.select().from(documentFiles);
  const rejected = await getRejectedFiles();

  const report = {
    timestamp: new Date().toISOString(),
    summary: status,
    files: allFiles.map(file => ({
      path: file.filePath,
      name: file.fileName,
      status: file.status,
      words: file.wordsCount,
      rejectedReason: file.rejectedReason,
      processedAt: file.processedAt,
      updatedAt: file.updatedAt,
    })),
    rejectedFiles: rejected.map(file => ({
      path: file.filePath,
      reason: file.rejectedReason,
    })),
  };

  const reportJson = JSON.stringify(report, null, 2);
  const reportPath = './processing-status.json';
  
  writeFileSync(reportPath, reportJson, 'utf-8');

  console.log('\n📊 Relatório de Status:');
  console.log(`   Total: ${status.total}`);
  console.log(`   Pendentes: ${status.pending}`);
  console.log(`   Em processamento: ${status.processing}`);
  console.log(`   Concluídos: ${status.completed} (${status.progress}%)`);
  console.log(`   Falhados: ${status.failed}`);
  console.log(`   Rejeitados: ${status.rejected}`);
  console.log(`\n📄 Relatório salvo em: ${reportPath}`);
}

main().catch(console.error);

