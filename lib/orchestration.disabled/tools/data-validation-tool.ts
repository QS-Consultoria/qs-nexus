import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

/**
 * Tool para validação de dados contábeis
 */

const DATA_VALIDATION_SCHEMA = z.object({
  validationType: z
    .enum(['balance_check', 'account_hierarchy', 'period_consistency', 'duplicate_entries'])
    .describe('Tipo de validação a ser executada'),
  organizationId: z.string().uuid().describe('ID da organização'),
  spedFileId: z.string().uuid().optional().describe('ID do arquivo SPED específico'),
})

interface ValidationResult {
  valid: boolean
  errors: Array<{
    code: string
    message: string
    severity: 'error' | 'warning'
    details?: any
  }>
  warnings: Array<{
    code: string
    message: string
    details?: any
  }>
  summary: {
    totalChecks: number
    passed: number
    failed: number
    warnings: number
  }
}

/**
 * Validação: Débito = Crédito
 */
async function validateBalanceCheck(
  organizationId: string,
  spedFileId?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
  }

  // Verificar saldo de lançamentos contábeis
  const query = sql`
    SELECT 
      je.entry_number,
      je.entry_date,
      SUM(ji.debit_value) as total_debit,
      SUM(ji.credit_value) as total_credit,
      ABS(SUM(ji.debit_value) - SUM(ji.credit_value)) as difference
    FROM journal_entries je
    JOIN journal_items ji ON je.entry_number = ji.entry_number AND je.sped_file_id = ji.sped_file_id
    WHERE je.organization_id = ${organizationId}
      ${spedFileId ? sql`AND je.sped_file_id = ${spedFileId}` : sql``}
    GROUP BY je.entry_number, je.entry_date, je.sped_file_id
    HAVING ABS(SUM(ji.debit_value) - SUM(ji.credit_value)) > 0.01
    LIMIT 100
  `

  const unbalancedEntries = await db.execute(query)
  result.summary.totalChecks++

  if (unbalancedEntries.rows.length > 0) {
    result.valid = false
    result.summary.failed++
    result.errors.push({
      code: 'UNBALANCED_ENTRIES',
      message: `Encontrados ${unbalancedEntries.rows.length} lançamentos desbalanceados (débito ≠ crédito)`,
      severity: 'error',
      details: unbalancedEntries.rows.slice(0, 10),
    })
  } else {
    result.summary.passed++
  }

  return result
}

/**
 * Validação: Hierarquia de contas (pai/filho)
 */
async function validateAccountHierarchy(
  organizationId: string,
  spedFileId?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
  }

  // Verificar se contas sintéticas têm filhas
  const query = sql`
    SELECT 
      account_code,
      account_name,
      account_type
    FROM chart_of_accounts
    WHERE organization_id = ${organizationId}
      ${spedFileId ? sql`AND sped_file_id = ${spedFileId}` : sql``}
      AND account_type = 'sintetica'
      AND account_code NOT IN (
        SELECT DISTINCT SUBSTRING(account_code, 1, LENGTH(account_code) - 1)
        FROM chart_of_accounts
        WHERE organization_id = ${organizationId}
          ${spedFileId ? sql`AND sped_file_id = ${spedFileId}` : sql``}
          AND LENGTH(account_code) > 1
      )
    LIMIT 50
  `

  const orphanAccounts = await db.execute(query)
  result.summary.totalChecks++

  if (orphanAccounts.rows.length > 0) {
    result.summary.warnings++
    result.warnings.push({
      code: 'SYNTHETIC_WITHOUT_CHILDREN',
      message: `${orphanAccounts.rows.length} contas sintéticas sem filhas`,
      details: orphanAccounts.rows.slice(0, 10),
    })
  } else {
    result.summary.passed++
  }

  return result
}

/**
 * Validação: Consistência de períodos
 */
async function validatePeriodConsistency(
  organizationId: string,
  spedFileId?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
  }

  // Verificar gaps de períodos
  const query = sql`
    SELECT 
      period,
      LAG(period) OVER (ORDER BY period) as prev_period
    FROM (
      SELECT DISTINCT period
      FROM account_balances
      WHERE organization_id = ${organizationId}
        ${spedFileId ? sql`AND sped_file_id = ${spedFileId}` : sql``}
      ORDER BY period
    ) periods
  `

  const periods = await db.execute(query)
  result.summary.totalChecks++

  // Verificar gaps de mais de 1 mês
  let gapsFound = 0
  for (const row of periods.rows) {
    if (row.prev_period) {
      const prev = new Date(row.prev_period)
      const curr = new Date(row.period)
      const monthsDiff =
        (curr.getFullYear() - prev.getFullYear()) * 12 + (curr.getMonth() - prev.getMonth())

      if (monthsDiff > 1) {
        gapsFound++
      }
    }
  }

  if (gapsFound > 0) {
    result.summary.warnings++
    result.warnings.push({
      code: 'PERIOD_GAPS',
      message: `Encontrados ${gapsFound} gaps nos períodos de saldos`,
      details: { gapsCount: gapsFound },
    })
  } else {
    result.summary.passed++
  }

  return result
}

/**
 * Validação: Lançamentos duplicados
 */
async function validateDuplicateEntries(
  organizationId: string,
  spedFileId?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
  }

  // Buscar lançamentos com mesmo número
  const query = sql`
    SELECT 
      entry_number,
      COUNT(*) as occurrences,
      ARRAY_AGG(DISTINCT entry_date) as dates
    FROM journal_entries
    WHERE organization_id = ${organizationId}
      ${spedFileId ? sql`AND sped_file_id = ${spedFileId}` : sql``}
    GROUP BY entry_number
    HAVING COUNT(*) > 1
    LIMIT 50
  `

  const duplicates = await db.execute(query)
  result.summary.totalChecks++

  if (duplicates.rows.length > 0) {
    result.summary.warnings++
    result.warnings.push({
      code: 'DUPLICATE_ENTRY_NUMBERS',
      message: `${duplicates.rows.length} números de lançamentos duplicados`,
      details: duplicates.rows.slice(0, 10),
    })
  } else {
    result.summary.passed++
  }

  return result
}

export function createDataValidationTool(organizationId: string) {
  return new DynamicStructuredTool({
    name: 'validate_accounting_data',
    description: `Valida a qualidade e consistência de dados contábeis.
    
    Tipos de validação:
    - balance_check: Verifica se débito = crédito em todos os lançamentos
    - account_hierarchy: Valida hierarquia de contas sintéticas/analíticas
    - period_consistency: Verifica gaps e inconsistências em períodos
    - duplicate_entries: Detecta lançamentos duplicados
    
    Use para garantir a qualidade dos dados antes de análises importantes.
    Retorna um relatório detalhado com erros e warnings encontrados.
    `,
    schema: DATA_VALIDATION_SCHEMA,
    func: async ({
      validationType,
      spedFileId,
    }: z.infer<typeof DATA_VALIDATION_SCHEMA>) => {
      try {
        let result: ValidationResult

        switch (validationType) {
          case 'balance_check':
            result = await validateBalanceCheck(organizationId, spedFileId)
            break

          case 'account_hierarchy':
            result = await validateAccountHierarchy(organizationId, spedFileId)
            break

          case 'period_consistency':
            result = await validatePeriodConsistency(organizationId, spedFileId)
            break

          case 'duplicate_entries':
            result = await validateDuplicateEntries(organizationId, spedFileId)
            break

          default:
            return JSON.stringify({
              error: `Tipo de validação não suportado: ${validationType}`,
            })
        }

        return JSON.stringify({
          success: true,
          validationType,
          ...result,
        })
      } catch (error) {
        return JSON.stringify({
          error: error instanceof Error ? error.message : 'Erro ao validar dados',
        })
      }
    },
  })
}

