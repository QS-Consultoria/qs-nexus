import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

/**
 * Tool para executar queries SQL em dados SPED normalizados
 * Com tenant isolation e validação de segurança
 */

const SQL_QUERY_SCHEMA = z.object({
  query: z.string().describe('Query SQL a ser executada (SELECT apenas)'),
  organizationId: z.string().uuid().describe('ID da organização para isolamento de tenant'),
})

// Lista de palavras-chave proibidas para segurança
const FORBIDDEN_KEYWORDS = [
  'DROP',
  'DELETE',
  'TRUNCATE',
  'INSERT',
  'UPDATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
]

/**
 * Valida que a query é segura (somente SELECT)
 */
function validateQuery(query: string): { valid: boolean; error?: string } {
  const upperQuery = query.toUpperCase()

  // Verifica palavras-chave proibidas
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (upperQuery.includes(keyword)) {
      return {
        valid: false,
        error: `Operação ${keyword} não permitida. Apenas queries SELECT são aceitas.`,
      }
    }
  }

  // Verifica se é SELECT
  if (!upperQuery.trim().startsWith('SELECT')) {
    return {
      valid: false,
      error: 'Apenas queries SELECT são permitidas.',
    }
  }

  return { valid: true }
}

/**
 * Injeta filtro de tenant na query
 */
function addTenantFilter(query: string, organizationId: string): string {
  // Esta é uma implementação simplificada
  // Em produção, usar um parser SQL real para injetar WHERE clause
  const hasWhere = query.toUpperCase().includes('WHERE')
  
  if (hasWhere) {
    // Adiciona AND organization_id = 'xxx'
    return query.replace(
      /WHERE/i,
      `WHERE organization_id = '${organizationId}' AND`
    )
  } else {
    // Adiciona WHERE organization_id = 'xxx' antes de ORDER BY, LIMIT, etc
    const parts = query.split(/\b(ORDER BY|LIMIT|OFFSET|GROUP BY)\b/i)
    const mainQuery = parts[0]
    const rest = parts.slice(1).join('')
    
    return `${mainQuery.trim()} WHERE organization_id = '${organizationId}' ${rest}`
  }
}

export function createSqlQueryTool(organizationId: string) {
  return new DynamicStructuredTool({
    name: 'query_fiscal_data',
    description: `Executa queries SQL para analisar dados fiscais e contábeis normalizados.
    
    Dados disponíveis:
    - sped_files: Arquivos SPED importados (cnpj, company_name, period_start, period_end)
    - chart_of_accounts: Plano de contas (account_code, account_name, account_type, account_nature)
    - account_balances: Saldos das contas (account_code, debit_balance, credit_balance, period)
    - journal_entries: Lançamentos contábeis (entry_number, entry_date, entry_type)
    - journal_items: Partidas dos lançamentos (account_code, debit_value, credit_value, history)
    - document_files: Documentos RAG (file_name, status, words_count)
    - templates: Templates classificados (title, metadata)
    
    IMPORTANTE: Não incluir WHERE organization_id manualmente - será injetado automaticamente.
    Exemplos:
    - "SELECT COUNT(*) FROM sped_files WHERE period_start >= '2024-01-01'"
    - "SELECT account_code, account_name, debit_balance FROM account_balances WHERE debit_balance > 10000"
    - "SELECT entry_date, COUNT(*) as total FROM journal_entries GROUP BY entry_date ORDER BY entry_date DESC LIMIT 10"
    `,
    schema: SQL_QUERY_SCHEMA,
    func: async ({ query }: z.infer<typeof SQL_QUERY_SCHEMA>) => {
      try {
        // 1. Validar query
        const validation = validateQuery(query)
        if (!validation.valid) {
          return JSON.stringify({ error: validation.error })
        }

        // 2. Injetar tenant filter
        const secureQuery = addTenantFilter(query, organizationId)

        // 3. Executar query com timeout
        const result = await Promise.race([
          db.execute(sql.raw(secureQuery)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 30000)
          ),
        ])

        // 4. Retornar resultados
        return JSON.stringify({
          success: true,
          rows: (result as any).rows,
          rowCount: (result as any).rows.length,
          query: secureQuery,
        })
      } catch (error) {
        return JSON.stringify({
          error: error instanceof Error ? error.message : 'Erro ao executar query',
        })
      }
    },
  })
}

