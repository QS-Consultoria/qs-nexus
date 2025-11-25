import postgres from 'postgres'
import { config } from 'dotenv'
import { resolve } from 'path'

// Carrega .env.local explicitamente
config({ path: resolve(process.cwd(), '.env.local') })

async function checkSystem() {
  console.log('🔍 Verificação do Sistema LegalWise RAG\n')
  console.log('='.repeat(50))

  // 1. Verificar variáveis de ambiente
  console.log('\n📋 1. VARIÁVEIS DE AMBIENTE:')
  const envVars = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'text-embedding-3-small (padrão)',
  }

  for (const [key, value] of Object.entries(envVars)) {
    const status = value ? '✅' : '❌'
    const display = typeof value === 'boolean' ? (value ? 'Configurado' : 'NÃO CONFIGURADO') : value
    console.log(`   ${status} ${key}: ${display}`)
  }

  // 2. Testar conexão com banco
  console.log('\n📋 2. BANCO DE DADOS (Neon PostgreSQL):')
  
  if (!process.env.DATABASE_URL) {
    console.log('   ❌ DATABASE_URL não configurada - impossível testar banco')
    return
  }

  const sql = postgres(process.env.DATABASE_URL)

  try {
    // Testa conexão
    const versionResult = await sql`SELECT version()`
    const version = versionResult[0].version
    console.log(`   ✅ Conexão OK`)
    console.log(`   📌 Versão: ${version.split(',')[0]}`)

    // Verifica extensão pgvector
    const vectorExt = await sql`SELECT * FROM pg_extension WHERE extname = 'vector'`
    if (vectorExt.length > 0) {
      console.log('   ✅ Extensão pgvector: Instalada')
    } else {
      console.log('   ❌ Extensão pgvector: NÃO instalada (necessário para busca vetorial)')
    }

    // Lista tabelas
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    console.log(`\n   📊 Tabelas encontradas: ${tables.length}`)
    tables.forEach(t => console.log(`      - ${t.table_name}`))

    // Estatísticas
    console.log('\n📋 3. ESTATÍSTICAS DO BANCO:')
    
    try {
      const docCount = await sql`SELECT COUNT(*) as count FROM document_files`
      const docByStatus = await sql`
        SELECT status, COUNT(*) as count 
        FROM document_files 
        GROUP BY status 
        ORDER BY status
      `
      console.log(`   📁 Arquivos: ${docCount[0].count}`)
      docByStatus.forEach(s => console.log(`      - ${s.status}: ${s.count}`))
    } catch {
      console.log('   ⚠️  Tabela document_files não existe')
    }

    try {
      const templateCount = await sql`SELECT COUNT(*) as count FROM templates`
      console.log(`   📄 Templates: ${templateCount[0].count}`)
    } catch {
      console.log('   ⚠️  Tabela templates não existe')
    }

    try {
      const chunkCount = await sql`SELECT COUNT(*) as count FROM template_chunks`
      const chunkWithEmb = await sql`SELECT COUNT(*) as count FROM template_chunks WHERE embedding IS NOT NULL`
      console.log(`   🧩 Chunks: ${chunkCount[0].count}`)
      console.log(`   🔢 Chunks com embedding: ${chunkWithEmb[0].count}`)
    } catch {
      console.log('   ⚠️  Tabela template_chunks não existe')
    }

    try {
      const configCount = await sql`SELECT COUNT(*) as count FROM classification_configs WHERE is_active = true`
      console.log(`   ⚙️  Configs de classificação ativas: ${configCount[0].count}`)
    } catch {
      console.log('   ⚠️  Tabela classification_configs não existe')
    }

    await sql.end()

  } catch (error: any) {
    console.log(`   ❌ Erro de conexão: ${error.message}`)
    if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.log('   💡 Dica: Verifique sua conexão de internet ou se o Neon está acessível')
    }
    if (error.message.includes('password')) {
      console.log('   💡 Dica: Verifique se a DATABASE_URL está correta')
    }
  }

  // 3. Resumo de APIs necessárias
  console.log('\n📋 4. APIS EXTERNAS NECESSÁRIAS:')
  console.log('   📌 OpenAI API (OPENAI_API_KEY):')
  console.log('      - Usado para: Embeddings (text-embedding-3-small)')
  console.log('      - Usado para: Classificação (se configurado como provider)')
  console.log(`      - Status: ${envVars.OPENAI_API_KEY ? '✅ Configurado' : '❌ NÃO configurado'}`)
  
  console.log('\n   📌 Google AI API (GOOGLE_GENERATIVE_AI_API_KEY):')
  console.log('      - Usado para: Classificação (se configurado como provider)')
  console.log('      - Usado para: Estruturação de markdown (DOC/PDF)')
  console.log(`      - Status: ${envVars.GOOGLE_GENERATIVE_AI_API_KEY ? '✅ Configurado' : '⚠️  Opcional mas recomendado'}`)

  // 4. Resumo final
  console.log('\n' + '='.repeat(50))
  console.log('📋 RESUMO:')
  
  const allGood = envVars.DATABASE_URL && envVars.OPENAI_API_KEY && envVars.NEXTAUTH_SECRET
  
  if (allGood) {
    console.log('   ✅ Sistema pronto para uso!')
    console.log('\n   🚀 Para iniciar: npm run dev')
    console.log('   📍 Acesse: http://localhost:3000')
  } else {
    console.log('   ⚠️  Algumas configurações estão faltando.')
    console.log('   💡 Verifique o arquivo .env.local')
  }

  console.log('\n' + '='.repeat(50))
}

checkSystem().catch(console.error)

