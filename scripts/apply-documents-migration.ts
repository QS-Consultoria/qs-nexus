/**
 * Script para aplicar migration da tabela documents no Neon DB
 * USO: tsx scripts/apply-documents-migration.ts
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

dotenv.config({ path: '.env.local' })

async function applyMigration() {
  console.log('🔍 Verificando se tabela documents já existe...')
  
  try {
    // Verificar se tabela já existe
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      );
    `)
    
    const exists = (tableCheck as any)[0]?.exists
    
    if (exists) {
      console.log('✅ Tabela documents já existe! Nenhuma ação necessária.')
      process.exit(0)
    }
    
    console.log('📄 Tabela documents não existe. Aplicando migration...')
    
    // Ler arquivo de migration
    const migrationPath = join(process.cwd(), 'lib/db/migrations/0014_create_documents_table.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Aplicar migration
    await db.execute(sql.raw(migrationSQL))
    
    console.log('✅ Migration aplicada com sucesso!')
    
    // Verificar criação
    const verify = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position;
    `)
    
    console.log('\n📊 Colunas criadas:')
    const columns = verify as any
    if (Array.isArray(columns)) {
      columns.forEach((row: any) => {
        console.log(`   - ${row.column_name}: ${row.data_type}`)
      })
    }
    
    // Verificar índices
    const indexes = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'documents';
    `)
    
    console.log('\n🔍 Índices criados:')
    const indexList = indexes as any
    if (Array.isArray(indexList)) {
      indexList.forEach((row: any) => {
        console.log(`   - ${row.indexname}`)
      })
    }
    
    console.log('\n✅ MIGRATION COMPLETA!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error)
    process.exit(1)
  }
}

applyMigration()

