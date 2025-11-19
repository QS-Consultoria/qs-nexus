import * as dotenv from 'dotenv';
import { resetFileStatus, getFileByPath } from '../lib/services/file-tracker.js';

dotenv.config({ path: '.env.local' });

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Uso: npm run rag:reprocess <caminho-relativo-do-arquivo>');
    console.error('   Exemplo: npm run rag:reprocess "../list-docx/01. Trabalhista/documento.docx"');
    process.exit(1);
  }

  try {
    const file = await getFileByPath(filePath);
    
    if (!file) {
      console.error(`❌ Arquivo não encontrado: ${filePath}`);
      process.exit(1);
    }

    if (file.status === 'rejected') {
      console.error(`❌ Não é possível reprocessar arquivos rejeitados: ${filePath}`);
      console.error(`   Motivo: ${file.rejectedReason || 'Desconhecido'}`);
      process.exit(1);
    }

    const success = await resetFileStatus(filePath);
    
    if (success) {
      console.log(`✅ Status resetado para: ${filePath}`);
      console.log('   O arquivo será reprocessado na próxima execução do pipeline');
    } else {
      console.error(`❌ Erro ao resetar status: ${filePath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Erro:`, error);
    process.exit(1);
  }
}

main().catch(console.error);

