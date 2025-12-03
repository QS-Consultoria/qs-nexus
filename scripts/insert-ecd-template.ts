import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from '../lib/db'
import {
  spedFiles,
  chartOfAccounts,
  accountBalances,
  journalEntries,
  journalItems,
} from '../lib/db/schema/sped'
import { organizations } from '../lib/db/schema/organizations'
import { ragUsers } from '../lib/db/schema/rag-users'
import { eq } from 'drizzle-orm'

/**
 * Script para inserir template de dados ECD normalizados direto no Neon DB
 * 
 * Cria:
 * - 1 arquivo SPED ECD
 * - Plano de contas completo (Ativo, Passivo, PL, Receitas, Despesas)
 * - Saldos contábeis do período
 * - Lançamentos contábeis (partidas dobradas)
 */

async function insertECDTemplate() {
  console.log('\n🚀 INSERINDO TEMPLATE ECD NO NEON DB\n')

  try {
    // ================================================================
    // 1. Buscar organização e usuário
    // ================================================================
    console.log('📌 1. Buscando organização e usuário...')
    
    const [org] = await db
      .select()
      .from(organizations)
      .limit(1)

    if (!org) {
      throw new Error('❌ Nenhuma organização encontrada! Rode npm run db:seed primeiro.')
    }

    const [user] = await db
      .select()
      .from(ragUsers)
      .where(eq(ragUsers.email, 'admin@qsconsultoria.com.br'))
      .limit(1)

    if (!user) {
      throw new Error('❌ Usuário admin não encontrado! Rode npm run db:seed primeiro.')
    }

    console.log(`   ✓ Organização: ${org.name}`)
    console.log(`   ✓ Usuário: ${user.email}`)

    // ================================================================
    // 2. Criar arquivo SPED ECD
    // ================================================================
    console.log('\n📄 2. Criando arquivo SPED ECD...')

    const [spedFile] = await db
      .insert(spedFiles)
      .values({
        organizationId: org.id,
        uploadedBy: user.id,
        fileName: 'ECD_TEMPLATE_2024.txt',
        filePath: '/uploads/sped/ecd_template_2024.txt',
        fileHash: 'template_ecd_' + Date.now(),
        fileType: 'ecd',
        cnpj: '21.358.126/0001-02',
        companyName: 'EMPRESA MODELO LTDA',
        stateCode: 'SP',
        cityCode: '3550308', // São Paulo
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        status: 'completed',
        totalRecords: 0,
        processedRecords: 0,
        processedAt: new Date(),
      })
      .returning()

    console.log(`   ✓ SPED File ID: ${spedFile.id}`)
    console.log(`   ✓ CNPJ: ${spedFile.cnpj}`)
    console.log(`   ✓ Período: ${spedFile.periodStart} a ${spedFile.periodEnd}`)

    // ================================================================
    // 3. Criar Plano de Contas (C050) - Template Completo
    // ================================================================
    console.log('\n📊 3. Criando Plano de Contas...')

    const accounts = [
      // ATIVO (1)
      { code: '1', name: 'ATIVO', type: 'S' as const, level: 1, nature: 'ativo' as const },
      { code: '1.1', name: 'ATIVO CIRCULANTE', type: 'S' as const, level: 2, parent: '1', nature: 'ativo' as const },
      { code: '1.1.1', name: 'DISPONÍVEL', type: 'S' as const, level: 3, parent: '1.1', nature: 'ativo' as const },
      { code: '1.1.1.01', name: 'CAIXA', type: 'A' as const, level: 4, parent: '1.1.1', nature: 'ativo' as const },
      { code: '1.1.1.02', name: 'BANCOS CONTA MOVIMENTO', type: 'A' as const, level: 4, parent: '1.1.1', nature: 'ativo' as const },
      { code: '1.1.2', name: 'CLIENTES', type: 'S' as const, level: 3, parent: '1.1', nature: 'ativo' as const },
      { code: '1.1.2.01', name: 'DUPLICATAS A RECEBER', type: 'A' as const, level: 4, parent: '1.1.2', nature: 'ativo' as const },

      // PASSIVO (2)
      { code: '2', name: 'PASSIVO', type: 'S' as const, level: 1, nature: 'passivo' as const },
      { code: '2.1', name: 'PASSIVO CIRCULANTE', type: 'S' as const, level: 2, parent: '2', nature: 'passivo' as const },
      { code: '2.1.1', name: 'FORNECEDORES', type: 'S' as const, level: 3, parent: '2.1', nature: 'passivo' as const },
      { code: '2.1.1.01', name: 'FORNECEDORES NACIONAIS', type: 'A' as const, level: 4, parent: '2.1.1', nature: 'passivo' as const },
      { code: '2.1.2', name: 'OBRIGAÇÕES FISCAIS', type: 'S' as const, level: 3, parent: '2.1', nature: 'passivo' as const },
      { code: '2.1.2.01', name: 'IMPOSTOS A RECOLHER', type: 'A' as const, level: 4, parent: '2.1.2', nature: 'passivo' as const },

      // PATRIMÔNIO LÍQUIDO (3)
      { code: '3', name: 'PATRIMÔNIO LÍQUIDO', type: 'S' as const, level: 1, nature: 'patrimonio_liquido' as const },
      { code: '3.1', name: 'CAPITAL SOCIAL', type: 'S' as const, level: 2, parent: '3', nature: 'patrimonio_liquido' as const },
      { code: '3.1.1', name: 'CAPITAL SUBSCRITO', type: 'A' as const, level: 3, parent: '3.1', nature: 'patrimonio_liquido' as const },
      { code: '3.2', name: 'LUCROS ACUMULADOS', type: 'A' as const, level: 2, parent: '3', nature: 'patrimonio_liquido' as const },

      // RECEITAS (4)
      { code: '4', name: 'RECEITAS', type: 'S' as const, level: 1, nature: 'receita' as const },
      { code: '4.1', name: 'RECEITA BRUTA', type: 'S' as const, level: 2, parent: '4', nature: 'receita' as const },
      { code: '4.1.1', name: 'VENDAS DE PRODUTOS', type: 'A' as const, level: 3, parent: '4.1', nature: 'receita' as const },
      { code: '4.1.2', name: 'PRESTAÇÃO DE SERVIÇOS', type: 'A' as const, level: 3, parent: '4.1', nature: 'receita' as const },

      // DESPESAS (5)
      { code: '5', name: 'DESPESAS', type: 'S' as const, level: 1, nature: 'despesa' as const },
      { code: '5.1', name: 'CUSTOS OPERACIONAIS', type: 'S' as const, level: 2, parent: '5', nature: 'despesa' as const },
      { code: '5.1.1', name: 'SALÁRIOS E ENCARGOS', type: 'A' as const, level: 3, parent: '5.1', nature: 'despesa' as const },
      { code: '5.1.2', name: 'ALUGUÉIS', type: 'A' as const, level: 3, parent: '5.1', nature: 'despesa' as const },
    ]

    const accountRecords = []
    for (const acc of accounts) {
      const [inserted] = await db
        .insert(chartOfAccounts)
        .values({
          organizationId: org.id,
          spedFileId: spedFile.id,
          accountCode: acc.code,
          accountName: acc.name,
          accountType: acc.type,
          accountLevel: acc.level,
          parentAccountCode: acc.parent || null,
          accountNature: acc.nature,
          startDate: '2024-01-01',
        })
        .returning()

      accountRecords.push(inserted)
    }

    console.log(`   ✓ ${accountRecords.length} contas criadas`)

    // ================================================================
    // 4. Criar Saldos Contábeis (I150/I155)
    // ================================================================
    console.log('\n💰 4. Criando saldos contábeis...')

    const balances = [
      // Ativo
      { accountCode: '1.1.1.01', initial: 10000.00, debit: 50000.00, credit: 45000.00, final: 15000.00, initialInd: 'D', finalInd: 'D' },
      { accountCode: '1.1.1.02', initial: 50000.00, debit: 200000.00, credit: 180000.00, final: 70000.00, initialInd: 'D', finalInd: 'D' },
      { accountCode: '1.1.2.01', initial: 30000.00, debit: 100000.00, credit: 80000.00, final: 50000.00, initialInd: 'D', finalInd: 'D' },
      
      // Passivo
      { accountCode: '2.1.1.01', initial: 20000.00, debit: 50000.00, credit: 60000.00, final: 30000.00, initialInd: 'C', finalInd: 'C' },
      { accountCode: '2.1.2.01', initial: 10000.00, debit: 20000.00, credit: 25000.00, final: 15000.00, initialInd: 'C', finalInd: 'C' },
      
      // Patrimônio Líquido
      { accountCode: '3.1.1', initial: 50000.00, debit: 0.00, credit: 0.00, final: 50000.00, initialInd: 'C', finalInd: 'C' },
      { accountCode: '3.2', initial: 10000.00, debit: 0.00, credit: 30000.00, final: 40000.00, initialInd: 'C', finalInd: 'C' },
      
      // Receitas
      { accountCode: '4.1.1', initial: 0.00, debit: 0.00, credit: 150000.00, final: 150000.00, initialInd: 'C', finalInd: 'C' },
      { accountCode: '4.1.2', initial: 0.00, debit: 0.00, credit: 80000.00, final: 80000.00, initialInd: 'C', finalInd: 'C' },
      
      // Despesas
      { accountCode: '5.1.1', initial: 0.00, debit: 120000.00, credit: 0.00, final: 120000.00, initialInd: 'D', finalInd: 'D' },
      { accountCode: '5.1.2', initial: 0.00, debit: 50000.00, credit: 0.00, final: 50000.00, initialInd: 'D', finalInd: 'D' },
    ]

    for (const bal of balances) {
      const account = accountRecords.find(a => a.accountCode === bal.accountCode)
      
      await db.insert(accountBalances).values({
        spedFileId: spedFile.id,
        chartOfAccountId: account?.id || null,
        accountCode: bal.accountCode,
        periodDate: '2024-12-31',
        initialBalance: bal.initial.toString(),
        debitTotal: bal.debit.toString(),
        creditTotal: bal.credit.toString(),
        finalBalance: bal.final.toString(),
        initialBalanceIndicator: bal.initialInd,
        finalBalanceIndicator: bal.finalInd,
      })
    }

    console.log(`   ✓ ${balances.length} saldos criados`)

    // ================================================================
    // 5. Criar Lançamentos Contábeis (I200/I250) - Partidas Dobradas
    // ================================================================
    console.log('\n📝 5. Criando lançamentos contábeis...')

    // Lançamento 1: Venda à vista
    const [entry1] = await db
      .insert(journalEntries)
      .values({
        organizationId: org.id,
        spedFileId: spedFile.id,
        entryNumber: '1',
        entryDate: '2024-01-15',
        entryAmount: '10000.00',
        description: 'VENDA DE PRODUTOS À VISTA',
      })
      .returning()

    await db.insert(journalItems).values([
      {
        organizationId: org.id,
        journalEntryId: entry1.id,
        accountCode: '1.1.1.02',
        amount: '10000.00',
        debitCredit: 'D',
        itemDescription: 'Recebimento venda produtos',
      },
      {
        organizationId: org.id,
        journalEntryId: entry1.id,
        accountCode: '4.1.1',
        amount: '10000.00',
        debitCredit: 'C',
        itemDescription: 'Receita venda produtos',
      },
    ])

    // Lançamento 2: Pagamento de salários
    const [entry2] = await db
      .insert(journalEntries)
      .values({
        organizationId: org.id,
        spedFileId: spedFile.id,
        entryNumber: '2',
        entryDate: '2024-01-30',
        entryAmount: '15000.00',
        description: 'PAGAMENTO FOLHA JANEIRO/2024',
      })
      .returning()

    await db.insert(journalItems).values([
      {
        organizationId: org.id,
        journalEntryId: entry2.id,
        accountCode: '5.1.1',
        amount: '15000.00',
        debitCredit: 'D',
        itemDescription: 'Despesa salários janeiro',
      },
      {
        organizationId: org.id,
        journalEntryId: entry2.id,
        accountCode: '1.1.1.02',
        amount: '15000.00',
        debitCredit: 'C',
        itemDescription: 'Pagamento salários',
      },
    ])

    // Lançamento 3: Pagamento de fornecedor
    const [entry3] = await db
      .insert(journalEntries)
      .values({
        organizationId: org.id,
        spedFileId: spedFile.id,
        entryNumber: '3',
        entryDate: '2024-02-10',
        entryAmount: '8000.00',
        description: 'PAGAMENTO FORNECEDOR ABC LTDA',
      })
      .returning()

    await db.insert(journalItems).values([
      {
        organizationId: org.id,
        journalEntryId: entry3.id,
        accountCode: '2.1.1.01',
        amount: '8000.00',
        debitCredit: 'D',
        itemDescription: 'Baixa fornecedor',
      },
      {
        organizationId: org.id,
        journalEntryId: entry3.id,
        accountCode: '1.1.1.02',
        amount: '8000.00',
        debitCredit: 'C',
        itemDescription: 'Pagamento fornecedor',
      },
    ])

    console.log(`   ✓ 3 lançamentos criados (6 partidas)`)

    // ================================================================
    // 6. Atualizar contador de registros
    // ================================================================
    await db
      .update(spedFiles)
      .set({
        totalRecords: accountRecords.length + balances.length + 3,
        processedRecords: accountRecords.length + balances.length + 3,
      })
      .where(eq(spedFiles.id, spedFile.id))

    // ================================================================
    // 7. Resumo Final
    // ================================================================
    console.log('\n═══════════════════════════════════════════')
    console.log('✅ TEMPLATE ECD INSERIDO COM SUCESSO!')
    console.log('═══════════════════════════════════════════')
    console.log(`📄 Arquivo SPED: ${spedFile.fileName}`)
    console.log(`🏢 Empresa: ${spedFile.companyName}`)
    console.log(`📊 CNPJ: ${spedFile.cnpj}`)
    console.log(`📅 Período: ${spedFile.periodStart} a ${spedFile.periodEnd}`)
    console.log(`\n📈 Dados Inseridos:`)
    console.log(`   - ${accountRecords.length} contas contábeis`)
    console.log(`   - ${balances.length} saldos contábeis`)
    console.log(`   - 3 lançamentos (6 partidas dobradas)`)
    console.log('\n🔗 Acesse no sistema:')
    console.log(`   http://localhost:4000/sped`)
    console.log('═══════════════════════════════════════════\n')

  } catch (error) {
    console.error('\n❌ ERRO:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

// Executar
insertECDTemplate()

