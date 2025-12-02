import { db } from '@/lib/db'
import { 
  organizations, 
  organizationMembers
} from './schema/organizations'
import { ragUsers } from './schema/rag-users'
import {
  workflowTemplates,
} from './schema/workflows'
import {
  metadataSchemas,
  BASE_SCHEMAS,
} from './schema/metadata-schemas'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

/**
 * Script de Seed - Dados iniciais do QS Nexus
 * 
 * Cria:
 * - Organização default (QS Consultoria)
 * - Super Admin user
 * - Workflows globais de exemplo
 * - Schemas de metadados base (SPED ECD, Legal Documents)
 */

async function seed() {
  console.log('🌱 Iniciando seed do QS Nexus...\n')

  try {
    // ==================================================
    // 1. Criar organização default
    // ==================================================
    console.log('📊 Criando organização default...')
    
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, 'qs-consultoria'))
      .limit(1)

    let orgId: string

    if (existingOrg.length > 0) {
      console.log('   ✓ Organização QS Consultoria já existe')
      orgId = existingOrg[0].id
    } else {
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: 'QS Consultoria',
          slug: 'qs-consultoria',
          cnpj: '00000000000100', // CNPJ fictício
          logoUrl: null,
          settings: {
            theme: 'dark',
            timezone: 'America/Sao_Paulo',
            fiscalYearStart: '01-01',
            features: {
              enableWorkflows: true,
              enableChat: true,
              enableAdvancedAnalysis: true,
            },
          },
          isActive: true,
        })
        .returning()

      orgId = newOrg.id
      console.log('   ✓ Organização QS Consultoria criada:', orgId)
    }

    // ==================================================
    // 2. Criar Super Admin
    // ==================================================
    console.log('\n👤 Criando Super Admin...')

    const existingUser = await db
      .select()
      .from(ragUsers)
      .where(eq(ragUsers.email, 'admin@qsconsultoria.com.br'))
      .limit(1)

    let userId: string

    if (existingUser.length > 0) {
      console.log('   ✓ Super Admin já existe')
      userId = existingUser[0].id
    } else {
      const hashedPassword = await bcrypt.hash('admin123!@#', 10)

      const [newUser] = await db
        .insert(ragUsers)
        .values({
          email: 'admin@qsconsultoria.com.br',
          password: hashedPassword,
          name: 'Administrador QS',
          globalRole: 'super_admin',
          isActive: true,
        })
        .returning()

      userId = newUser.id
      console.log('   ✓ Super Admin criado:', newUser.email)
      console.log('   📧 Email: admin@qsconsultoria.com.br')
      console.log('   🔑 Senha: admin123!@#')
    }

    // ==================================================
    // 3. Criar membership
    // ==================================================
    console.log('\n🔗 Vinculando usuário à organização...')

    const existingMembership = await db
      .select()
      .from(organizationMembers)
      .where(
        eq(organizationMembers.userId, userId)
      )
      .limit(1)

    if (existingMembership.length === 0) {
      await db.insert(organizationMembers).values({
        organizationId: orgId,
        userId: userId,
        role: 'admin_fiscal',
        isActive: true,
      })
      console.log('   ✓ Membership criada')
    } else {
      console.log('   ✓ Membership já existe')
    }

    // ==================================================
    // 3.1 Criar usuários de exemplo
    // ==================================================
    console.log('\n👥 Criando usuários de exemplo...')

    const exampleUsers = [
      {
        email: 'fiscal@qsconsultoria.com.br',
        password: 'fiscal123',
        name: 'Carlos Fiscal',
        globalRole: 'admin_fiscal' as const,
        orgRole: 'admin_fiscal' as const,
      },
      {
        email: 'usuario@qsconsultoria.com.br',
        password: 'usuario123',
        name: 'Maria Usuária',
        globalRole: 'user_fiscal' as const,
        orgRole: 'user_fiscal' as const,
      },
      {
        email: 'consultor@qsconsultoria.com.br',
        password: 'consultor123',
        name: 'João Consultor',
        globalRole: 'consultor_ia' as const,
        orgRole: 'consultor_ia' as const,
      },
      {
        email: 'viewer@qsconsultoria.com.br',
        password: 'viewer123',
        name: 'Ana Visualizadora',
        globalRole: 'viewer' as const,
        orgRole: 'viewer' as const,
      },
    ]

    for (const userData of exampleUsers) {
      const [existing] = await db
        .select()
        .from(ragUsers)
        .where(eq(ragUsers.email, userData.email))
        .limit(1)

      if (existing) {
        console.log(`   ✓ ${userData.name} já existe`)
        continue
      }

      const hashedPwd = await bcrypt.hash(userData.password, 10)
      const [newUser] = await db
        .insert(ragUsers)
        .values({
          email: userData.email,
          password: hashedPwd,
          name: userData.name,
          globalRole: userData.globalRole,
          isActive: true,
        })
        .returning()

      await db.insert(organizationMembers).values({
        organizationId: orgId,
        userId: newUser.id,
        role: userData.orgRole,
        invitedBy: userId,
        invitedAt: new Date(),
        isActive: true,
      })

      console.log(`   ✓ ${userData.name} criado: ${userData.email}`)
    }

    // ==================================================
    // 4. Criar Schemas de Metadados Base
    // ==================================================
    console.log('\n📋 Criando schemas de metadados base...')

    // NOTA: Schemas e workflows podem ser criados via UI após login
    console.log('   ℹ️  Schemas podem ser criados via UI em /settings/template-schema')

    // ==================================================
    // 5. Criar Workflows Globais de Exemplo (DISABLED)
    // ==================================================
    console.log('\n⚙️  Workflows globais (skipped - schema needs fixing)')
    
    // TODO: Fix workflow langchainGraph types and re-enable
    /*
    const existingWorkflow = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.name, 'Análise Fiscal Básica'))
      .limit(1)

    if (existingWorkflow.length === 0) {
      await db.insert(workflowTemplates).values({
        name: 'Análise Fiscal Básica',
        description: 'Workflow de exemplo para análise básica de dados SPED',
        isShared: true,
        langchainGraph: {
          nodes: [
            {
              id: 'start',
              type: 'input',
              config: { schema: { spedFileId: 'string' } },
            },
            {
              id: 'validate',
              type: 'tool',
              tool: 'data_validator',
              config: {},
            },
            {
              id: 'analyze',
              type: 'llm',
              config: { provider: 'openai', model: 'gpt-4' },
            },
            {
              id: 'end',
              type: 'output',
              config: { schema: { report: 'object', summary: 'string' } },
            },
          ],
          edges: [
            { from: 'start', to: 'validate' },
            { from: 'validate', to: 'analyze' },
            { from: 'analyze', to: 'end' },
          ],
        },
        inputSchema: {
          type: 'object',
          properties: {
            spedFileId: { type: 'string', description: 'ID do arquivo SPED a analisar' },
          },
          required: ['spedFileId'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            report: { type: 'object' },
            summary: { type: 'string' },
          },
        },
        createdBy: userId,
      })
      console.log('   ✓ Workflow "Análise Fiscal Básica" criado')
    } else {
      console.log('   ✓ Workflow "Análise Fiscal Básica" já existe')
    }
    */

    // ==================================================
    // 6. Log de auditoria
    // ==================================================
    // NOTA: auditLogs removido do schema
    console.log('   ✓ Seed data criado com sucesso')

    console.log('\n✅ Seed concluído com sucesso!\n')
    console.log('═══════════════════════════════════════════')
    console.log('📊 Organização: QS Consultoria')
    console.log('\n👤 Usuários Criados:')
    console.log('   🔴 Super Admin: admin@qsconsultoria.com.br / admin123!@#')
    console.log('   🔵 Admin Fiscal: fiscal@qsconsultoria.com.br / fiscal123')
    console.log('   🟢 User Fiscal: usuario@qsconsultoria.com.br / usuario123')
    console.log('   🟣 Consultor IA: consultor@qsconsultoria.com.br / consultor123')
    console.log('   ⚪ Viewer: viewer@qsconsultoria.com.br / viewer123')
    console.log('═══════════════════════════════════════════\n')
  } catch (error) {
    console.error('❌ Erro no seed:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

// Executar seed
seed()

