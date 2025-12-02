import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL!

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurado')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { max: 1 })

interface AuditResult {
  section: string
  status: 'ok' | 'warning' | 'error'
  details: string[]
  issues?: string[]
  recommendations?: string[]
}

const results: AuditResult[] = []

async function auditExtensions() {
  console.log('\n📦 1. VERIFICANDO EXTENSÕES...\n')
  
  const extensions = await sql`
    SELECT extname, extversion 
    FROM pg_extension 
    WHERE extname IN ('vector', 'uuid-ossp', 'pg_trgm')
  `
  
  const details: string[] = []
  const issues: string[] = []
  
  extensions.forEach(ext => {
    details.push(`✅ ${ext.extname} v${ext.extversion}`)
  })
  
  if (!extensions.find(e => e.extname === 'vector')) {
    issues.push('❌ pgvector NÃO instalado (necessário para embeddings)')
  }
  
  results.push({
    section: 'Extensões PostgreSQL',
    status: issues.length > 0 ? 'error' : 'ok',
    details,
    issues
  })
  
  details.forEach(d => console.log(`   ${d}`))
  issues.forEach(i => console.log(`   ${i}`))
}

async function auditTables() {
  console.log('\n📋 2. VERIFICANDO TABELAS...\n')
  
  const tables = await sql`
    SELECT table_name, 
           (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `
  
  const expectedTables = [
    'rag_users',
    'organizations', 
    'organization_members',
    'notifications',
    'document_files',
    'templates',
    'template_chunks',
    'template_schema_configs',
    'classification_configs',
    'sped_files',
    'chart_of_accounts',
    'account_balances',
    'journal_entries',
    'journal_items'
  ]
  
  const existingTables = tables.map(t => t.table_name)
  const missing = expectedTables.filter(t => !existingTables.includes(t))
  const extra = existingTables.filter(t => !expectedTables.includes(t))
  
  const details: string[] = []
  const issues: string[] = []
  
  details.push(`Total de tabelas: ${tables.length}`)
  tables.forEach(t => {
    details.push(`  ✅ ${t.table_name} (${t.column_count} colunas)`)
  })
  
  if (missing.length > 0) {
    issues.push(`❌ Tabelas faltando: ${missing.join(', ')}`)
  }
  
  if (extra.length > 0) {
    details.push(`⚠️  Tabelas extras (não esperadas): ${extra.join(', ')}`)
  }
  
  results.push({
    section: 'Estrutura de Tabelas',
    status: missing.length > 0 ? 'error' : 'ok',
    details,
    issues
  })
  
  details.forEach(d => console.log(`   ${d}`))
  issues.forEach(i => console.log(`   ${i}`))
}

async function auditForeignKeys() {
  console.log('\n🔗 3. VERIFICANDO FOREIGN KEYS...\n')
  
  const fks = await sql`
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name
  `
  
  const details: string[] = []
  details.push(`Total de Foreign Keys: ${fks.length}`)
  
  fks.forEach(fk => {
    details.push(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
  })
  
  results.push({
    section: 'Foreign Keys',
    status: 'ok',
    details
  })
  
  console.log(`   Total: ${fks.length} foreign keys`)
  if (fks.length > 0) {
    console.log(`   Exemplos:`)
    fks.slice(0, 5).forEach(fk => {
      console.log(`     ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
    })
  }
}

async function auditIndexes() {
  console.log('\n🔍 4. VERIFICANDO ÍNDICES...\n')
  
  const indexes = await sql`
    SELECT
        tablename,
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `
  
  const details: string[] = []
  const recommendations: string[] = []
  
  details.push(`Total de índices: ${indexes.length}`)
  
  const byTable: { [key: string]: number } = {}
  indexes.forEach(idx => {
    byTable[idx.tablename] = (byTable[idx.tablename] || 0) + 1
  })
  
  Object.entries(byTable).forEach(([table, count]) => {
    details.push(`  ${table}: ${count} índices`)
  })
  
  // Verificar índices críticos
  const hasVectorIndex = indexes.some(i => i.indexdef.includes('vector') || i.indexdef.includes('embedding'))
  const hasOrgIndex = indexes.some(i => i.indexname.includes('org') || i.indexname.includes('organization'))
  
  if (!hasVectorIndex) {
    recommendations.push('💡 Considerar criar índice HNSW/IVFFlat para busca vetorial mais rápida')
  }
  
  if (!hasOrgIndex) {
    recommendations.push('💡 Adicionar índices em organization_id para melhor performance multi-tenant')
  }
  
  results.push({
    section: 'Índices',
    status: 'ok',
    details,
    recommendations
  })
  
  details.forEach(d => console.log(`   ${d}`))
  recommendations.forEach(r => console.log(`   ${r}`))
}

async function auditEnums() {
  console.log('\n📝 5. VERIFICANDO ENUMs...\n')
  
  const enums = await sql`
    SELECT n.nspname as schema, t.typname as typename, 
           array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
    FROM pg_type t 
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
    LEFT JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid)) 
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND t.typtype = 'e'
    GROUP BY n.nspname, t.typname
    ORDER BY t.typname
  `
  
  const details: string[] = []
  details.push(`Total de ENUMs: ${enums.length}`)
  
  enums.forEach(e => {
    details.push(`  ${e.typename}: [${e.values.join(', ')}]`)
  })
  
  results.push({
    section: 'ENUMs e Tipos',
    status: 'ok',
    details
  })
  
  details.forEach(d => console.log(`   ${d}`))
}

async function auditData() {
  console.log('\n💾 6. VERIFICANDO DADOS...\n')
  
  const tables = [
    'rag_users',
    'organizations',
    'organization_members',
    'notifications',
    'document_files',
    'templates',
    'template_chunks',
    'classification_configs',
    'template_schema_configs',
    'sped_files'
  ]
  
  const details: string[] = []
  const issues: string[] = []
  
  for (const table of tables) {
    try {
      const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`)
      const count = parseInt(result[0].count)
      details.push(`  ${table}: ${count} registros`)
      
      if (table === 'rag_users' && count === 0) {
        issues.push(`⚠️  Nenhum usuário cadastrado`)
      }
      if (table === 'organizations' && count === 0) {
        issues.push(`⚠️  Nenhuma organização cadastrada`)
      }
    } catch (error) {
      issues.push(`❌ Erro ao contar ${table}: ${error}`)
    }
  }
  
  results.push({
    section: 'Dados Existentes',
    status: issues.length > 0 ? 'warning' : 'ok',
    details,
    issues
  })
  
  details.forEach(d => console.log(`   ${d}`))
  issues.forEach(i => console.log(`   ${i}`))
}

async function auditEmbeddings() {
  console.log('\n🧠 7. VERIFICANDO EMBEDDINGS...\n')
  
  const details: string[] = []
  const issues: string[] = []
  const recommendations: string[] = []
  
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(embedding) as chunks_with_embeddings,
        COUNT(*) - COUNT(embedding) as chunks_without_embeddings
      FROM template_chunks
    `
    
    if (stats.length > 0) {
      const s = stats[0]
      details.push(`Total de chunks: ${s.total_chunks}`)
      details.push(`Chunks com embeddings: ${s.chunks_with_embeddings}`)
      details.push(`Chunks sem embeddings: ${s.chunks_without_embeddings}`)
      
      if (parseInt(s.chunks_with_embeddings) > 0) {
        const dim = await sql`
          SELECT vector_dims(embedding) as dimension
          FROM template_chunks 
          WHERE embedding IS NOT NULL 
          LIMIT 1
        `
        if (dim.length > 0) {
          details.push(`Dimensão dos embeddings: ${dim[0].dimension}`)
          if (dim[0].dimension !== 1536) {
            issues.push(`⚠️  Dimensão esperada: 1536 (text-embedding-3-small), encontrada: ${dim[0].dimension}`)
          }
        }
      } else {
        recommendations.push(`💡 Nenhum embedding gerado ainda. Processe alguns documentos para testar RAG.`)
      }
    }
  } catch (error) {
    issues.push(`❌ Erro ao verificar embeddings: ${error}`)
  }
  
  results.push({
    section: 'Embeddings',
    status: issues.length > 0 ? 'warning' : 'ok',
    details,
    issues,
    recommendations
  })
  
  details.forEach(d => console.log(`   ${d}`))
  issues.forEach(i => console.log(`   ${i}`))
  recommendations.forEach(r => console.log(`   ${r}`))
}

async function auditConfig() {
  console.log('\n⚙️  8. VERIFICANDO CONFIGURAÇÕES DO BANCO...\n')
  
  const config = await sql`
    SELECT name, setting, unit 
    FROM pg_settings 
    WHERE name IN ('max_connections', 'shared_buffers', 'work_mem', 'maintenance_work_mem')
  `
  
  const connections = await sql`SELECT count(*) as active FROM pg_stat_activity`
  
  const details: string[] = []
  
  config.forEach(c => {
    details.push(`${c.name}: ${c.setting}${c.unit || ''}`)
  })
  
  details.push(`Conexões ativas: ${connections[0].active}`)
  
  results.push({
    section: 'Configurações do Banco',
    status: 'ok',
    details
  })
  
  details.forEach(d => console.log(`   ${d}`))
}

async function generateReport() {
  console.log('\n' + '='.repeat(70))
  console.log('📊 RELATÓRIO FINAL DA AUDITORIA')
  console.log('='.repeat(70) + '\n')
  
  let totalIssues = 0
  let totalWarnings = 0
  let totalRecommendations = 0
  
  results.forEach(r => {
    const icon = r.status === 'ok' ? '✅' : r.status === 'warning' ? '⚠️' : '❌'
    console.log(`${icon} ${r.section}: ${r.status.toUpperCase()}`)
    
    if (r.issues && r.issues.length > 0) {
      totalIssues += r.issues.length
      console.log(`   Problemas encontrados: ${r.issues.length}`)
    }
    
    if (r.status === 'warning') {
      totalWarnings++
    }
    
    if (r.recommendations && r.recommendations.length > 0) {
      totalRecommendations += r.recommendations.length
    }
  })
  
  console.log('\n' + '='.repeat(70))
  console.log('📈 RESUMO EXECUTIVO')
  console.log('='.repeat(70) + '\n')
  
  console.log(`Total de seções auditadas: ${results.length}`)
  console.log(`Problemas críticos: ${totalIssues}`)
  console.log(`Avisos: ${totalWarnings}`)
  console.log(`Recomendações: ${totalRecommendations}`)
  
  console.log('\n✅ CHECKLIST DE READINESS:\n')
  
  const hasAllTables = results.find(r => r.section === 'Estrutura de Tabelas')?.status === 'ok'
  const hasExtensions = results.find(r => r.section === 'Extensões PostgreSQL')?.status === 'ok'
  const hasFKs = results.find(r => r.section === 'Foreign Keys')?.details.length > 0
  const hasIndexes = results.find(r => r.section === 'Índices')?.details.length > 0
  const hasData = results.find(r => r.section === 'Dados Existentes')?.status !== 'error'
  
  console.log(`   ${hasExtensions ? '✅' : '❌'} pgvector instalado`)
  console.log(`   ${hasAllTables ? '✅' : '❌'} Todas as tabelas necessárias existem`)
  console.log(`   ${hasFKs ? '✅' : '❌'} Foreign keys configuradas`)
  console.log(`   ${hasIndexes ? '✅' : '❌'} Índices criados`)
  console.log(`   ${hasData ? '✅' : '❌'} Dados de seed/configuração`)
  
  const isReady = hasExtensions && hasAllTables && hasFKs && hasIndexes
  
  console.log('\n' + '='.repeat(70))
  if (isReady && totalIssues === 0) {
    console.log('🎉 BANCO DE DADOS 100% PRONTO PARA PRODUÇÃO!')
  } else if (isReady && totalIssues > 0) {
    console.log('⚠️  BANCO FUNCIONAL, MAS COM ALGUMAS MELHORIAS RECOMENDADAS')
  } else {
    console.log('❌ BANCO PRECISA DE CORREÇÕES ANTES DE USO EM PRODUÇÃO')
  }
  console.log('='.repeat(70) + '\n')
  
  if (totalRecommendations > 0) {
    console.log('💡 RECOMENDAÇÕES:\n')
    results.forEach(r => {
      if (r.recommendations && r.recommendations.length > 0) {
        r.recommendations.forEach(rec => console.log(`   ${rec}`))
      }
    })
    console.log('')
  }
}

async function main() {
  console.log('🔍 AUDITORIA COMPLETA DO BANCO DE DADOS NEON\n')
  console.log('Database:', DATABASE_URL.split('@')[1]?.split('?')[0] || 'Neon DB')
  
  try {
    await auditExtensions()
    await auditTables()
    await auditForeignKeys()
    await auditIndexes()
    await auditEnums()
    await auditData()
    await auditEmbeddings()
    await auditConfig()
    await generateReport()
  } catch (error) {
    console.error('\n❌ Erro durante auditoria:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()

