import { sql } from 'drizzle-orm'
import { db } from '../lib/db'

async function validateDatabase() {
  console.log('🔍 Validando estrutura do banco de dados...\n')
  
  try {
    // 1. Verificar ENUMs
    console.log('1️⃣ Verificando ENUMs relacionados a document...')
    const enums = await db.execute(sql.raw(`
      SELECT typname, enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname LIKE '%document%'
      ORDER BY typname, enumsortorder;
    `))
    
    console.log('ENUMs encontrados:')
    const enumsByType: Record<string, string[]> = {}
    const rows = Array.isArray(enums) ? enums : (enums as any).rows || []
    for (const row of rows as any[]) {
      if (!enumsByType[row.typname]) {
        enumsByType[row.typname] = []
      }
      enumsByType[row.typname].push(row.enumlabel)
    }
    
    for (const [typname, labels] of Object.entries(enumsByType)) {
      console.log(`  - ${typname}: [${labels.join(', ')}]`)
    }
    console.log()
    
    // Validar ENUMs esperados
    const expectedEnums = {
      'document_type': ['pdf', 'docx', 'doc', 'txt', 'other'],
      'document_category': ['juridico', 'contabil', 'geral'],
      'document_status': ['pending', 'processing', 'completed', 'failed']
    }
    
    for (const [enumName, expectedValues] of Object.entries(expectedEnums)) {
      const actualValues = enumsByType[enumName] || []
      const missing = expectedValues.filter(v => !actualValues.includes(v))
      const extra = actualValues.filter(v => !expectedValues.includes(v))
      
      if (missing.length > 0 || extra.length > 0) {
        console.log(`  ⚠️  ENUM ${enumName}:`)
        if (missing.length > 0) {
          console.log(`     - Valores faltando: ${missing.join(', ')}`)
        }
        if (extra.length > 0) {
          console.log(`     - Valores extras: ${extra.join(', ')}`)
        }
      } else {
        console.log(`  ✅ ENUM ${enumName} correto`)
      }
    }
    console.log()
    
    // 2. Verificar coluna document_type na tabela documents
    console.log('2️⃣ Verificando coluna document_type na tabela documents...')
    const columns = await db.execute(sql.raw(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name IN ('document_type', 'status', 'organization_id')
      ORDER BY column_name;
    `))
    
    const colRows = Array.isArray(columns) ? columns : (columns as any).rows || []
    if (colRows.length === 0) {
      console.log('  ❌ Tabela documents não encontrada ou colunas ausentes!')
    } else {
      console.log('Colunas na tabela documents:')
      for (const col of colRows as any[]) {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.udt_name}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default || ''}`)
      }
      
      const hasDocType = colRows.some((r: any) => r.column_name === 'document_type')
      if (!hasDocType) {
        console.log('  ❌ Coluna document_type NÃO EXISTE!')
      } else {
        console.log('  ✅ Coluna document_type existe')
      }
    }
    console.log()
    
    // 3. Contar registros por status em cada tabela
    console.log('3️⃣ Contando registros por status...')
    
    // Documents
    const docCounts = await db.execute(sql.raw(`
      SELECT 
        status, 
        COUNT(*) as count,
        COUNT(CASE WHEN document_type IS NULL THEN 1 END) as null_type_count
      FROM documents 
      GROUP BY status
      ORDER BY status;
    `))
    
    const docRows = Array.isArray(docCounts) ? docCounts : (docCounts as any).rows || []
    console.log('\n📄 Tabela documents:')
    if (docRows.length === 0) {
      console.log('  Nenhum registro encontrado')
    } else {
      for (const row of docRows as any[]) {
        console.log(`  - ${row.status}: ${row.count} registros (${row.null_type_count} com document_type NULL)`)
      }
    }
    
    // SPED Files
    const spedCounts = await db.execute(sql.raw(`
      SELECT status, COUNT(*) as count
      FROM sped_files 
      GROUP BY status
      ORDER BY status;
    `))
    
    const spedRows = Array.isArray(spedCounts) ? spedCounts : (spedCounts as any).rows || []
    console.log('\n📊 Tabela sped_files:')
    if (spedRows.length === 0) {
      console.log('  Nenhum registro encontrado')
    } else {
      for (const row of spedRows as any[]) {
        console.log(`  - ${row.status}: ${row.count} registros`)
      }
    }
    
    // CSV Imports
    try {
      const csvCounts = await db.execute(sql.raw(`
        SELECT status, COUNT(*) as count
        FROM csv_imports 
        GROUP BY status
        ORDER BY status;
      `))
      
      const csvRows = Array.isArray(csvCounts) ? csvCounts : (csvCounts as any).rows || []
      console.log('\n📈 Tabela csv_imports:')
      if (csvRows.length === 0) {
        console.log('  Nenhum registro encontrado')
      } else {
        for (const row of csvRows as any[]) {
          console.log(`  - ${row.status}: ${row.count} registros`)
        }
      }
    } catch (error: any) {
      if (error.code === '42P01') { // Table does not exist
        console.log('\n📈 Tabela csv_imports:')
        console.log('  ⚠️  Tabela não existe no banco de dados')
      } else {
        throw error
      }
    }
    console.log()
    
    // 4. Verificar tabelas RAG
    console.log('4️⃣ Verificando tabelas RAG...')
    
    const ragTables = [
      'document_files',
      'classification_configs',
      'template_schema_configs',
      'templates',
      'template_chunks'
    ]
    
    for (const tableName of ragTables) {
      const count = await db.execute(sql.raw(`
        SELECT COUNT(*) as count FROM ${tableName};
      `))
      const countRows = Array.isArray(count) ? count : (count as any).rows || []
      const total = countRows.length > 0 ? (countRows[0] as any).count : 0
      console.log(`  - ${tableName}: ${total} registros`)
    }
    console.log()
    
    // 5. Verificar template_chunks com embeddings
    console.log('5️⃣ Verificando embeddings em template_chunks...')
    const embeddingStats = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(embedding) as chunks_with_embedding,
        COUNT(CASE WHEN embedding IS NULL THEN 1 END) as chunks_without_embedding
      FROM template_chunks;
    `))
    
    const embRows = Array.isArray(embeddingStats) ? embeddingStats : (embeddingStats as any).rows || []
    const stats = embRows.length > 0 ? embRows[0] : { total_chunks: 0, chunks_with_embedding: 0, chunks_without_embedding: 0 }
    console.log(`  - Total de chunks: ${stats.total_chunks}`)
    console.log(`  - Chunks com embedding: ${stats.chunks_with_embedding}`)
    console.log(`  - Chunks sem embedding: ${stats.chunks_without_embedding}`)
    
    if (stats.chunks_without_embedding > 0) {
      console.log('  ⚠️  Existem chunks sem embeddings!')
    } else if (stats.total_chunks > 0) {
      console.log('  ✅ Todos os chunks têm embeddings')
    }
    console.log()
    
    console.log('✅ Validação concluída!\n')
    
  } catch (error) {
    console.error('❌ Erro durante validação:', error)
    process.exit(1)
  }
}

validateDatabase()

