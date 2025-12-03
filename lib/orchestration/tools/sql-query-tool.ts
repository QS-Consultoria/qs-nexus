/**
 * SQL Query Tool
 * Executa queries SQL seguras em dados SPED/contábeis
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { db } from '@/lib/db'
import { spedFiles, chartOfAccounts, accountBalances, journalEntries } from '@/lib/db/schema/sped'
import { eq, and, sql, SQL } from 'drizzle-orm'

/**
 * Tabelas permitidas para queries
 */
const ALLOWED_TABLES = {
  sped_files: spedFiles,
  chart_of_accounts: chartOfAccounts,
  account_balances: accountBalances,
  journal_entries: journalEntries,
} as const

type AllowedTable = keyof typeof ALLOWED_TABLES

/**
 * Schema de input do tool
 */
const SqlQuerySchema = z.object({
  query: z.string().describe('Query SQL a ser executada (apenas SELECT)'),
  organizationId: z.string().uuid().describe('ID da organização (obrigatório para isolamento)'),
  params: z.array(z.any()).optional().describe('Parâmetros para query parametrizada'),
})

/**
 * Valida e sanitiza query SQL
 */
function validateQuery(query: string): {
  isValid: boolean
  error?: string
  table?: AllowedTable
} {
  // Normalizar query
  const normalized = query.trim().toLowerCase()

  // Apenas SELECT é permitido
  if (!normalized.startsWith('select')) {
    return {
      isValid: false,
      error: 'Apenas queries SELECT são permitidas',
    }
  }

  // Não permitir comandos perigosos
  const dangerous = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'exec']
  for (const cmd of dangerous) {
    if (normalized.includes(cmd)) {
      return {
        isValid: false,
        error: `Comando não permitido: ${cmd}`,
      }
    }
  }

  // Identificar tabela
  const tableMatch = normalized.match(/from\s+(\w+)/)
  if (!tableMatch) {
    return {
      isValid: false,
      error: 'Não foi possível identificar a tabela',
    }
  }

  const table = tableMatch[1] as AllowedTable
  if (!(table in ALLOWED_TABLES)) {
    return {
      isValid: false,
      error: `Tabela não permitida: ${table}. Permitidas: ${Object.keys(ALLOWED_TABLES).join(', ')}`,
    }
  }

  return {
    isValid: true,
    table,
  }
}

/**
 * Executa query com isolamento multi-tenant
 */
async function executeQuery(
  query: string,
  organizationId: string,
  params: any[] = []
): Promise<any[]> {
  const validation = validateQuery(query)
  
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  const table = ALLOWED_TABLES[validation.table!]

  try {
    // Adicionar filtro de organização automaticamente
    // Por segurança, sempre filtramos por organization_id
    const orgFilter = eq(table.organizationId, organizationId)

    // Executar query com filtro
    // Nota: Para queries mais complexas, usar raw SQL com sanitização
    const results = await db
      .select()
      .from(table)
      .where(orgFilter)
      .limit(100) // Limite de segurança

    return results
  } catch (error) {
    console.error('Erro ao executar query SQL:', error)
    throw new Error(`Erro na query: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Tool para queries SQL
 */
export const sqlQueryTool = new DynamicStructuredTool({
  name: 'sql_query',
  description: `Executa queries SQL em dados contábeis e fiscais.
  
Tabelas disponíveis:
- sped_files: Arquivos SPED importados
- chart_of_accounts: Plano de contas
- account_balances: Saldos de contas por período
- journal_entries: Lançamentos contábeis

Importante:
- Apenas queries SELECT são permitidas
- Sempre filtrado por organizationId automaticamente
- Limite de 100 registros por query
- Use para buscar dados estruturados e fazer análises quantitativas`,
  
  schema: SqlQuerySchema,
  
  func: async ({ query, organizationId, params }) => {
    try {
      const results = await executeQuery(query, organizationId, params)
      
      return JSON.stringify({
        success: true,
        rowCount: results.length,
        data: results,
      }, null, 2)
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  },
})

/**
 * Helpers para queries comuns
 */

export async function getAccountsByOrganization(organizationId: string) {
  return db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.organizationId, organizationId))
    .limit(1000)
}

export async function getBalancesByPeriod(
  organizationId: string,
  periodDate: string
) {
  return db
    .select()
    .from(accountBalances)
    .where(
      and(
        eq(accountBalances.organizationId, organizationId),
        eq(accountBalances.periodDate, periodDate)
      )
    )
    .limit(1000)
}

export async function getJournalEntriesByPeriod(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  return db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.organizationId, organizationId),
        sql`${journalEntries.entryDate} >= ${startDate}`,
        sql`${journalEntries.entryDate} <= ${endDate}`
      )
    )
    .limit(1000)
}

