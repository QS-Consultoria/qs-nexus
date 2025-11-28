import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { db } from '@/lib/db'
import { spedFiles, chartOfAccounts, accountBalances } from '@/lib/db/schema/sped'
import { eq, and, gte, lte, sql } from 'drizzle-orm'

/**
 * Tool para análise de documentos fiscais SPED
 */

const DOCUMENT_ANALYSIS_SCHEMA = z.object({
  analysisType: z
    .enum(['balance_sheet', 'income_statement', 'account_summary', 'period_comparison'])
    .describe('Tipo de análise a ser realizada'),
  organizationId: z.string().uuid().describe('ID da organização'),
  spedFileId: z.string().uuid().optional().describe('ID do arquivo SPED específico (opcional)'),
  periodStart: z.string().optional().describe('Data inicial do período (YYYY-MM-DD)'),
  periodEnd: z.string().optional().describe('Data final do período (YYYY-MM-DD)'),
  accountCode: z.string().optional().describe('Código da conta para análise específica'),
})

/**
 * Análise de Balanço Patrimonial
 */
async function analyzeBalanceSheet(
  organizationId: string,
  spedFileId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  // Busca contas do Ativo (1.x), Passivo (2.x) e Patrimônio Líquido (3.x)
  const query = sql`
    SELECT 
      ca.account_nature,
      SUM(ab.debit_balance - ab.credit_balance) as net_balance,
      COUNT(DISTINCT ca.account_code) as account_count
    FROM ${chartOfAccounts} ca
    LEFT JOIN ${accountBalances} ab ON ca.account_code = ab.account_code
    WHERE ca.organization_id = ${organizationId}
      ${spedFileId ? sql`AND ca.sped_file_id = ${spedFileId}` : sql``}
      ${periodStart ? sql`AND ab.period >= ${periodStart}` : sql``}
      ${periodEnd ? sql`AND ab.period <= ${periodEnd}` : sql``}
      AND ca.account_nature IN ('ativo', 'passivo', 'patrimonio_liquido')
    GROUP BY ca.account_nature
  `

  const result = await db.execute(query)
  return result.rows
}

/**
 * Análise de Demonstração de Resultado (DRE)
 */
async function analyzeIncomeStatement(
  organizationId: string,
  spedFileId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  // Busca contas de Receita (4.x) e Despesa (5.x)
  const query = sql`
    SELECT 
      ca.account_nature,
      ca.account_type,
      SUM(ab.credit_balance - ab.debit_balance) as net_value,
      COUNT(DISTINCT ca.account_code) as account_count
    FROM ${chartOfAccounts} ca
    LEFT JOIN ${accountBalances} ab ON ca.account_code = ab.account_code
    WHERE ca.organization_id = ${organizationId}
      ${spedFileId ? sql`AND ca.sped_file_id = ${spedFileId}` : sql``}
      ${periodStart ? sql`AND ab.period >= ${periodStart}` : sql``}
      ${periodEnd ? sql`AND ab.period <= ${periodEnd}` : sql``}
      AND ca.account_nature IN ('receita', 'despesa')
    GROUP BY ca.account_nature, ca.account_type
    ORDER BY ca.account_nature, net_value DESC
  `

  const result = await db.execute(query)
  return result.rows
}

/**
 * Resumo de uma conta específica
 */
async function analyzeAccountSummary(
  organizationId: string,
  accountCode: string,
  spedFileId?: string
) {
  const query = sql`
    SELECT 
      ca.account_code,
      ca.account_name,
      ca.account_type,
      ca.account_nature,
      ab.debit_balance,
      ab.credit_balance,
      (ab.debit_balance - ab.credit_balance) as net_balance,
      ab.period
    FROM ${chartOfAccounts} ca
    LEFT JOIN ${accountBalances} ab ON ca.account_code = ab.account_code
    WHERE ca.organization_id = ${organizationId}
      AND ca.account_code = ${accountCode}
      ${spedFileId ? sql`AND ca.sped_file_id = ${spedFileId}` : sql``}
    ORDER BY ab.period DESC
    LIMIT 12
  `

  const result = await db.execute(query)
  return result.rows
}

/**
 * Comparação entre períodos
 */
async function analyzePeriodComparison(
  organizationId: string,
  periodStart?: string,
  periodEnd?: string
) {
  const query = sql`
    SELECT 
      ab.period,
      ca.account_nature,
      SUM(ab.debit_balance) as total_debit,
      SUM(ab.credit_balance) as total_credit,
      SUM(ab.debit_balance - ab.credit_balance) as net_balance
    FROM ${accountBalances} ab
    JOIN ${chartOfAccounts} ca ON ab.account_code = ca.account_code
    WHERE ca.organization_id = ${organizationId}
      ${periodStart ? sql`AND ab.period >= ${periodStart}` : sql``}
      ${periodEnd ? sql`AND ab.period <= ${periodEnd}` : sql``}
    GROUP BY ab.period, ca.account_nature
    ORDER BY ab.period DESC, ca.account_nature
  `

  const result = await db.execute(query)
  return result.rows
}

export function createDocumentAnalysisTool(organizationId: string) {
  return new DynamicStructuredTool({
    name: 'analyze_fiscal_document',
    description: `Analisa documentos fiscais SPED e gera insights contábeis.
    
    Tipos de análise disponíveis:
    - balance_sheet: Balanço Patrimonial (Ativo, Passivo, Patrimônio Líquido)
    - income_statement: Demonstração de Resultado (Receitas e Despesas)
    - account_summary: Resumo detalhado de uma conta específica
    - period_comparison: Comparação entre diferentes períodos
    
    Use para responder perguntas como:
    - "Qual o total do ativo da empresa?"
    - "Quais foram as receitas do último trimestre?"
    - "Como evoluiu a conta de despesas administrativas?"
    - "Comparar balanços de 2023 vs 2024"
    `,
    schema: DOCUMENT_ANALYSIS_SCHEMA,
    func: async ({
      analysisType,
      spedFileId,
      periodStart,
      periodEnd,
      accountCode,
    }: z.infer<typeof DOCUMENT_ANALYSIS_SCHEMA>) => {
      try {
        let results

        switch (analysisType) {
          case 'balance_sheet':
            results = await analyzeBalanceSheet(organizationId, spedFileId, periodStart, periodEnd)
            break

          case 'income_statement':
            results = await analyzeIncomeStatement(
              organizationId,
              spedFileId,
              periodStart,
              periodEnd
            )
            break

          case 'account_summary':
            if (!accountCode) {
              return JSON.stringify({ error: 'accountCode é obrigatório para account_summary' })
            }
            results = await analyzeAccountSummary(organizationId, accountCode, spedFileId)
            break

          case 'period_comparison':
            results = await analyzePeriodComparison(organizationId, periodStart, periodEnd)
            break

          default:
            return JSON.stringify({ error: `Tipo de análise não suportado: ${analysisType}` })
        }

        return JSON.stringify({
          success: true,
          analysisType,
          results,
          count: results.length,
          parameters: { spedFileId, periodStart, periodEnd, accountCode },
        })
      } catch (error) {
        return JSON.stringify({
          error: error instanceof Error ? error.message : 'Erro ao analisar documento',
        })
      }
    },
  })
}

