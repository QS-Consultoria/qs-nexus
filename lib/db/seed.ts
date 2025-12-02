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
      .from(users)
      .where(eq(users.email, 'admin@qsconsultoria.com.br'))
      .limit(1)

    let userId: string

    if (existingUser.length > 0) {
      console.log('   ✓ Super Admin já existe')
      userId = existingUser[0].id
    } else {
      const hashedPassword = await bcrypt.hash('admin123!@#', 10)

      const [newUser] = await db
        .insert(users)
        .values({
          email: 'admin@qsconsultoria.com.br',
          password: hashedPassword,
          fullName: 'Administrador QS',
          displayName: 'Admin',
          defaultOrgId: orgId,
          globalRole: 'super_admin',
          preferences: {
            theme: 'dark',
            language: 'pt-BR',
            notifications: {
              email: true,
              push: false,
            },
          },
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
      .from(organizationMemberships)
      .where(
        eq(organizationMemberships.userId, userId)
      )
      .limit(1)

    if (existingMembership.length === 0) {
      await db.insert(organizationMemberships).values({
        organizationId: orgId,
        userId: userId,
        role: 'owner',
        permissions: [],
        isActive: true,
        invitedBy: null,
      })
      console.log('   ✓ Membership criada')
    } else {
      console.log('   ✓ Membership já existe')
    }

    // ==================================================
    // 4. Criar Schemas de Metadados Base
    // ==================================================
    console.log('\n📋 Criando schemas de metadados base...')

    // Schema SPED ECD
    const existingSpedSchema = await db
      .select()
      .from(metadataSchemas)
      .where(eq(metadataSchemas.type, 'sped_ecd'))
      .limit(1)

    if (existingSpedSchema.length === 0) {
      await db.insert(metadataSchemas).values({
        name: BASE_SCHEMAS.sped_ecd.name,
        type: BASE_SCHEMAS.sped_ecd.type,
        description: 'Schema padrão para arquivos SPED ECD',
        baseSchema: BASE_SCHEMAS.sped_ecd.baseSchema,
        customFields: { fields: [] },
        validationRules: null,
        isActive: true,
        createdBy: userId,
      })
      console.log('   ✓ Schema SPED ECD criado')
    } else {
      console.log('   ✓ Schema SPED ECD já existe')
    }

    // Schema Legal Documents
    const existingLegalSchema = await db
      .select()
      .from(metadataSchemas)
      .where(eq(metadataSchemas.type, 'legal_document'))
      .limit(1)

    if (existingLegalSchema.length === 0) {
      await db.insert(metadataSchemas).values({
        name: BASE_SCHEMAS.legal_document.name,
        type: BASE_SCHEMAS.legal_document.type,
        description: 'Schema padrão para documentos legais',
        baseSchema: BASE_SCHEMAS.legal_document.baseSchema,
        customFields: { fields: [] },
        validationRules: null,
        isActive: true,
        createdBy: userId,
      })
      console.log('   ✓ Schema Legal Documents criado')
    } else {
      console.log('   ✓ Schema Legal Documents já existe')
    }

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
    await db.insert(auditLogs).values({
      organizationId: orgId,
      userId: userId,
      action: 'system.seed',
      entityType: 'system',
      entityId: 'seed',
      metadata: {
        timestamp: new Date().toISOString(),
        itemsCreated: ['organization', 'super_admin', 'schemas', 'workflows'],
      },
    })

    console.log('\n✅ Seed concluído com sucesso!\n')
    console.log('═══════════════════════════════════════════')
    console.log('📊 Organização: QS Consultoria')
    console.log('👤 Super Admin: admin@qsconsultoria.com.br')
    console.log('🔑 Senha: admin123!@#')
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

