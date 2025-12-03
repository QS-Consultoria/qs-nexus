/**
 * Data Validation Tool
 * Validações contábeis e de integridade de dados
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { db } from '@/lib/db'
import { chartOfAccounts, accountBalances, journalEntries, journalItems } from '@/lib/db/schema/sped'
import { eq, and, sql } from 'drizzle-orm'

/**
 * Schema de input do tool
 */
const DataValidationSchema = z.object({
  organizationId: z.string().uuid().describe('ID da organização'),
  spedFileId: z.string().uuid().optional().describe('ID do arquivo SPED específico'),
  validations: z.array(z.enum([
    'debit_credit_balance',
    'account_hierarchy',
    'period_consistency',
    'balance_integrity',
    'missing_accounts',
  ])).describe('Tipos de validações a executar'),
  periodDate: z.string().optional().describe('Data do período (YYYY-MM-DD)'),
})

/**
 * Validação: Débito = Crédito
 */
async function validateDebitCreditBalance(
  organizationId: string,
  spedFileId?: string
): Promise<{ valid: boolean; details: string; issues: any[] }> {
  try {
    const conditions = [eq(journalEntries.organizationId, organizationId)]
    if (spedFileId) {
      conditions.push(eq(journalEntries.spedFileId, spedFileId))
    }

    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .limit(1000)

    const issues: any[] = []

    for (const entry of entries) {
      // Buscar itens do lançamento
      const items = await db
        .select()
        .from(journalItems)
        .where(eq(journalItems.journalEntryId, entry.id))

      const totalDebit = items
        .filter(i => i.debitCredit === 'D')
        .reduce((sum, i) => sum + parseFloat(i.value || '0'), 0)

      const totalCredit = items
        .filter(i => i.debitCredit === 'C')
        .reduce((sum, i) => sum + parseFloat(i.value || '0'), 0)

      const difference = Math.abs(totalDebit - totalCredit)

      if (difference > 0.01) { // Tolerância de 1 centavo
        issues.push({
          entryNumber: entry.entryNumber,
          entryDate: entry.entryDate,
          totalDebit,
          totalCredit,
          difference,
          description: entry.description,
        })
      }
    }

    return {
      valid: issues.length === 0,
      details: issues.length === 0
        ? `Todos os ${entries.length} lançamentos estão balanceados (Débito = Crédito)`
        : `Encontrados ${issues.length} lançamentos desbalanceados de ${entries.length} analisados`,
      issues,
    }
  } catch (error) {
    return {
      valid: false,
      details: `Erro ao validar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      issues: [],
    }
  }
}

/**
 * Validação: Hierarquia de Contas
 */
async function validateAccountHierarchy(
  organizationId: string,
  spedFileId?: string
): Promise<{ valid: boolean; details: string; issues: any[] }> {
  try {
    const conditions = [eq(chartOfAccounts.organizationId, organizationId)]
    if (spedFileId) {
      conditions.push(eq(chartOfAccounts.spedFileId, spedFileId))
    }

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(...conditions))

    const issues: any[] = []

    for (const account of accounts) {
      // Verificar se conta superior existe (se especificada)
      if (account.superiorAccountCode) {
        const superior = accounts.find(
          a => a.accountCode === account.superiorAccountCode
        )

        if (!superior) {
          issues.push({
            accountCode: account.accountCode,
            accountName: account.accountName,
            superiorAccountCode: account.superiorAccountCode,
            issue: 'Conta superior não encontrada',
          })
        } else {
          // Verificar nível
          const expectedLevel = (superior.level || 0) + 1
          if (account.level !== expectedLevel) {
            issues.push({
              accountCode: account.accountCode,
              accountName: account.accountName,
              currentLevel: account.level,
              expectedLevel,
              issue: 'Nível inconsistente com hierarquia',
            })
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      details: issues.length === 0
        ? `Hierarquia de ${accounts.length} contas está consistente`
        : `Encontrados ${issues.length} problemas de hierarquia em ${accounts.length} contas`,
      issues,
    }
  } catch (error) {
    return {
      valid: false,
      details: `Erro ao validar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      issues: [],
    }
  }
}

/**
 * Validação: Consistência de Período
 */
async function validatePeriodConsistency(
  organizationId: string,
  periodDate: string
): Promise<{ valid: boolean; details: string; issues: any[] }> {
  try {
    const balances = await db
      .select()
      .from(accountBalances)
      .where(
        and(
          eq(accountBalances.organizationId, organizationId),
          eq(accountBalances.periodDate, periodDate)
        )
      )

    if (balances.length === 0) {
      return {
        valid: false,
        details: `Nenhum saldo encontrado para o período ${periodDate}`,
        issues: [],
      }
    }

    const issues: any[] = []

    for (const balance of balances) {
      const opening = parseFloat(balance.openingDebitBalance || '0') - parseFloat(balance.openingCreditBalance || '0')
      const movement = parseFloat(balance.debitMovement || '0') - parseFloat(balance.creditMovement || '0')
      const closing = parseFloat(balance.closingDebitBalance || '0') - parseFloat(balance.closingCreditBalance || '0')

      const calculated = opening + movement
      const difference = Math.abs(calculated - closing)

      if (difference > 0.01) {
        issues.push({
          accountCode: balance.accountCode,
          accountName: balance.accountName,
          opening,
          movement,
          calculatedClosing: calculated,
          reportedClosing: closing,
          difference,
        })
      }
    }

    return {
      valid: issues.length === 0,
      details: issues.length === 0
        ? `Saldos de ${balances.length} contas estão consistentes para o período ${periodDate}`
        : `Encontradas ${issues.length} inconsistências em ${balances.length} contas`,
      issues,
    }
  } catch (error) {
    return {
      valid: false,
      details: `Erro ao validar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      issues: [],
    }
  }
}

/**
 * Tool para validação de dados
 */
export const dataValidationTool = new DynamicStructuredTool({
  name: 'data_validation',
  description: `Executa validações contábeis e de integridade de dados.

Validações disponíveis:
- debit_credit_balance: Verifica se débitos = créditos em cada lançamento
- account_hierarchy: Valida hierarquia e níveis do plano de contas
- period_consistency: Verifica consistência de saldos (abertura + movimento = fechamento)
- balance_integrity: Valida integridade dos saldos contábeis
- missing_accounts: Identifica contas referenciadas mas não cadastradas

Útil para:
- Auditar arquivos SPED antes de envio
- Identificar inconsistências contábeis
- Validar importações de dados
- Gerar relatórios de exceção`,
  
  schema: DataValidationSchema,
  
  func: async ({ organizationId, spedFileId, validations, periodDate }) => {
    try {
      const results: Record<string, any> = {}

      for (const validation of validations) {
        switch (validation) {
          case 'debit_credit_balance':
            results.debitCreditBalance = await validateDebitCreditBalance(
              organizationId,
              spedFileId
            )
            break

          case 'account_hierarchy':
            results.accountHierarchy = await validateAccountHierarchy(
              organizationId,
              spedFileId
            )
            break

          case 'period_consistency':
            if (!periodDate) {
              results.periodConsistency = {
                valid: false,
                details: 'periodDate é obrigatório para esta validação',
                issues: [],
              }
            } else {
              results.periodConsistency = await validatePeriodConsistency(
                organizationId,
                periodDate
              )
            }
            break

          default:
            results[validation] = {
              valid: false,
              details: 'Validação não implementada ainda',
              issues: [],
            }
        }
      }

      const allValid = Object.values(results).every((r: any) => r.valid)

      return JSON.stringify({
        success: true,
        allValid,
        summary: `${Object.values(results).filter((r: any) => r.valid).length}/${validations.length} validações passaram`,
        results,
      }, null, 2)
    } catch (error) {
      console.error('Erro na validação de dados:', error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  },
})

