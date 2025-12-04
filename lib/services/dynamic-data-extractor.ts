import { db } from '../db'
import { sql } from 'drizzle-orm'
import { getSchema } from './schema-manager'
import { generateInsertSQL } from './table-generator'
import type { DocumentSchemaField } from '../db/schema/document-schemas'

// Alias para compatibilidade
type FieldDefinition = DocumentSchemaField

/**
 * Serviço para extrair e inserir dados em tabelas dinâmicas
 */

/**
 * Extrai dados classificados e insere na tabela customizada
 * 
 * @param schemaId ID do schema customizado
 * @param extractedData Dados extraídos pela IA (metadata da classificação)
 * @param systemData Dados do sistema (IDs, paths, etc)
 * @returns Registro inserido na tabela customizada
 */
export async function insertIntoCustomTable(
  schemaId: string,
  extractedData: Record<string, any>,
  systemData: {
    organizationId: string
    documentId?: string
    processedDocumentId?: string
    extractedBy: string
    sourceFilePath: string
    confidenceScore?: number
  }
) {
  // Buscar schema
  const schema = await getSchema(schemaId, systemData.organizationId)
  
  if (!schema) {
    throw new Error(`Schema ${schemaId} não encontrado`)
  }
  
  if (!schema.sqlTableCreated) {
    throw new Error(`Tabela ${schema.tableName} ainda não foi criada. Execute a criação da tabela primeiro.`)
  }
  
  if (!schema.isActive) {
    throw new Error(`Schema ${schema.name} está desativado`)
  }
  
  // Validar que campos obrigatórios foram extraídos
  const fields = schema.fields as FieldDefinition[]
  const missingRequired: string[] = []
  
  for (const field of fields) {
    if (field.isRequired) {
      const value = extractedData[field.fieldName]
      if (value === undefined || value === null || value === '') {
        missingRequired.push(field.displayName || field.fieldName)
      }
    }
  }
  
  if (missingRequired.length > 0) {
    throw new Error(`Campos obrigatórios não foram extraídos: ${missingRequired.join(', ')}`)
  }
  
  // Gerar INSERT SQL
  const { sql: insertSQL, values } = generateInsertSQL(
    schema.tableName,
    fields,
    extractedData,
    {
      ...systemData,
      confidenceScore: systemData.confidenceScore ?? 0.95
    }
  )
  
  // Executar INSERT
  try {
    const result = await db.execute(sql.raw(insertSQL, values))
    const insertedRows = Array.isArray(result) ? result : (result as any).rows || []
    
    return {
      success: true,
      tableName: schema.tableName,
      recordId: insertedRows[0]?.id,
      data: insertedRows[0]
    }
  } catch (error) {
    console.error(`Erro ao inserir em tabela customizada ${schema.tableName}:`, error)
    throw new Error(`Erro ao salvar dados estruturados: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Consulta dados de uma tabela customizada
 */
export async function queryCustomTable(
  schemaId: string,
  organizationId: string,
  options?: {
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'ASC' | 'DESC'
    filters?: Record<string, any>
  }
) {
  const schema = await getSchema(schemaId, organizationId)
  
  if (!schema) {
    throw new Error('Schema não encontrado')
  }
  
  if (!schema.tableCreated) {
    throw new Error('Tabela ainda não foi criada')
  }
  
  // Montar query
  let query = `SELECT * FROM ${schema.tableName} WHERE organization_id = $1`
  const params: any[] = [organizationId]
  let paramIndex = 2
  
  // Filtros
  if (options?.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      query += ` AND ${key} = $${paramIndex++}`
      params.push(value)
    }
  }
  
  // Ordenação
  if (options?.orderBy) {
    query += ` ORDER BY ${options.orderBy} ${options?.orderDirection || 'DESC'}`
  } else {
    query += ` ORDER BY extracted_at DESC`
  }
  
  // Paginação
  query += ` LIMIT ${options?.limit || 100}`
  if (options?.offset) {
    query += ` OFFSET ${options.offset}`
  }
  
  const result = await db.execute(sql.raw(query, params))
  const rows = Array.isArray(result) ? result : (result as any).rows || []
  
  return {
    schema,
    records: rows,
    total: rows.length
  }
}

/**
 * Busca registro específico por ID
 */
export async function getCustomTableRecord(
  schemaId: string,
  recordId: string,
  organizationId: string
) {
  const schema = await getSchema(schemaId, organizationId)
  
  if (!schema || !schema.tableCreated) {
    throw new Error('Schema ou tabela não encontrada')
  }
  
  const result = await db.execute(sql.raw(`
    SELECT * FROM ${schema.tableName}
    WHERE id = $1 AND organization_id = $2
    LIMIT 1
  `, [recordId, organizationId]))
  
  const rows = Array.isArray(result) ? result : (result as any).rows || []
  
  return rows[0] || null
}

/**
 * Atualiza registro em tabela customizada
 */
export async function updateCustomTableRecord(
  schemaId: string,
  recordId: string,
  organizationId: string,
  data: Record<string, any>
) {
  const schema = await getSchema(schemaId, organizationId)
  
  if (!schema || !schema.tableCreated) {
    throw new Error('Schema ou tabela não encontrada')
  }
  
  const fields = schema.fields as FieldDefinition[]
  
  // Montar UPDATE apenas com campos que existem no schema
  const updates: string[] = []
  const params: any[] = []
  let paramIndex = 1
  
  for (const field of fields) {
    if (data[field.fieldName] !== undefined) {
      updates.push(`${field.fieldName} = $${paramIndex++}`)
      params.push(data[field.fieldName])
    }
  }
  
  if (updates.length === 0) {
    throw new Error('Nenhum campo válido para atualizar')
  }
  
  // Adicionar WHERE params
  params.push(recordId, organizationId)
  
  const updateSQL = `
    UPDATE ${schema.tableName}
    SET ${updates.join(', ')}, metadata = metadata || $${paramIndex++}
    WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
    RETURNING *
  `
  
  params.splice(updates.length, 0, JSON.stringify(data))  // Atualiza metadata também
  
  const result = await db.execute(sql.raw(updateSQL, params))
  const rows = Array.isArray(result) ? result : (result as any).rows || []
  
  return rows[0] || null
}

/**
 * Deleta registro de tabela customizada
 */
export async function deleteCustomTableRecord(
  schemaId: string,
  recordId: string,
  organizationId: string
) {
  const schema = await getSchema(schemaId, organizationId)
  
  if (!schema || !schema.tableCreated) {
    throw new Error('Schema ou tabela não encontrada')
  }
  
  await db.execute(sql.raw(`
    DELETE FROM ${schema.tableName}
    WHERE id = $1 AND organization_id = $2
  `, [recordId, organizationId]))
  
  return { success: true }
}

