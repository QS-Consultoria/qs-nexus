import { sql } from 'drizzle-orm'
import { db } from '../db'
import { documentSchemas, type DocumentSchema, type DocumentSchemaField } from '../db/schema/document-schemas'
import { eq } from 'drizzle-orm'
import { incrementSchemaUsage } from './schema-migration-engine'

/**
 * Dual Storage Handler
 * 
 * Responsável por salvar dados extraídos de documentos em DOIS lugares simultaneamente:
 * 1. Tabela SQL customizada (dados estruturados para queries)
 * 2. Índice RAG (fragmentos com embeddings para busca semântica)
 */

// ================================================================
// Tipos
// ================================================================

export interface DualStorageInput {
  schemaId: string
  sourceDocumentId: string  // ID do documento original (documents, sped_files, csv_imports)
  organizationId: string
  extractedData: Record<string, any>  // Dados extraídos pela IA
  createdBy?: string
}

export interface DualStorageResult {
  success: boolean
  customTableRecordId?: string  // UUID do registro na tabela customizada
  processedDocumentId?: string  // UUID do registro em processed_documents
  error?: string
}

// ================================================================
// Função Principal: Salvar em Ambos
// ================================================================

export async function saveToDualStorage(
  input: DualStorageInput
): Promise<DualStorageResult> {
  try {
    // 1. Buscar schema
    const [schema] = await db
      .select()
      .from(documentSchemas)
      .where(eq(documentSchemas.id, input.schemaId))
      .limit(1)
    
    if (!schema) {
      return { success: false, error: 'Schema não encontrado' }
    }
    
    if (!schema.sqlTableCreated) {
      return { success: false, error: 'Tabela SQL ainda não foi criada para este schema' }
    }
    
    console.log(`[DUAL-STORAGE] Salvando dados para schema: ${schema.name}`)
    console.log(`[DUAL-STORAGE] Tabela customizada: ${schema.tableName}`)
    
    // 2. Salvar na tabela customizada (sempre)
    const customRecordId = await saveToCustomTable(
      schema,
      input.sourceDocumentId,
      input.organizationId,
      input.extractedData,
      input.createdBy
    )
    
    console.log(`[DUAL-STORAGE] ✅ Salvo em ${schema.tableName}: ${customRecordId}`)
    
    // 3. Incrementar contador de uso do schema
    await incrementSchemaUsage(schema.id)
    
    // 4. Se RAG estiver habilitado, salvar também no índice RAG
    // (por enquanto, apenas retorna - será implementado depois)
    // TODO: Integrar com processed_documents e document_chunks
    
    return {
      success: true,
      customTableRecordId: customRecordId,
    }
    
  } catch (error: any) {
    console.error('[DUAL-STORAGE] ❌ Erro ao salvar:', error)
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    }
  }
}

// ================================================================
// Storage 1: Tabela SQL Customizada
// ================================================================

async function saveToCustomTable(
  schema: DocumentSchema,
  sourceDocumentId: string,
  organizationId: string,
  extractedData: Record<string, any>,
  createdBy?: string
): Promise<string> {
  const fields = schema.fields as DocumentSchemaField[]
  
  // Determinar nome da coluna de FK baseado no baseType
  const foreignKeyColumn = getForeignKeyColumnName(schema.baseType)
  
  // Preparar valores
  const columnNames: string[] = ['id', foreignKeyColumn, 'organization_id']
  const values: any[] = [sql`gen_random_uuid()`, sourceDocumentId, organizationId]
  const placeholders: string[] = ['gen_random_uuid()', `'${sourceDocumentId}'`, `'${organizationId}'`]
  
  // Adicionar campos customizados
  fields.forEach(field => {
    const value = extractedData[field.fieldName]
    
    // Se campo é obrigatório mas não foi extraído, usar valor padrão ou lançar erro
    if (field.isRequired && (value === undefined || value === null)) {
      if (field.defaultValue) {
        columnNames.push(field.fieldName)
        values.push(field.defaultValue)
        placeholders.push(`'${field.defaultValue}'`)
      } else {
        throw new Error(`Campo obrigatório "${field.fieldName}" não foi extraído e não tem valor padrão`)
      }
    } else if (value !== undefined && value !== null) {
      columnNames.push(field.fieldName)
      values.push(value)
      
      // Formatar valor de acordo com o tipo
      const formattedValue = formatValueForSQL(value, field.fieldType)
      placeholders.push(formattedValue)
    }
  })
  
  // Adicionar auditoria
  if (createdBy) {
    columnNames.push('created_by')
    placeholders.push(`'${createdBy}'`)
  }
  
  // Gerar INSERT SQL
  const insertSQL = `
    INSERT INTO ${schema.tableName} 
      (${columnNames.join(', ')})
    VALUES 
      (${placeholders.join(', ')})
    RETURNING id
  `.trim()
  
  console.log(`[DUAL-STORAGE] SQL INSERT:\n${insertSQL}`)
  
  // Executar
  const result = await db.execute(sql.raw(insertSQL))
  const rows = result.rows as any[]
  
  if (rows && rows.length > 0) {
    return rows[0].id
  }
  
  throw new Error('Falha ao inserir registro - nenhum ID retornado')
}

// ================================================================
// Helpers
// ================================================================

function getForeignKeyColumnName(baseType: string): string {
  switch (baseType) {
    case 'document':
      return 'document_id'
    case 'sped':
      return 'sped_file_id'
    case 'csv':
      return 'csv_import_id'
    default:
      throw new Error(`Base type desconhecido: ${baseType}`)
  }
}

function formatValueForSQL(value: any, fieldType: string): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  
  switch (fieldType) {
    case 'text':
      // Escapar aspas simples
      const escaped = String(value).replace(/'/g, "''")
      return `'${escaped}'`
    
    case 'numeric':
      return String(Number(value))
    
    case 'date':
      // Espera formato ISO: YYYY-MM-DD
      return `'${value}'`
    
    case 'boolean':
      return value ? 'TRUE' : 'FALSE'
    
    default:
      return `'${value}'`
  }
}

// ================================================================
// Query: Buscar dados da tabela customizada
// ================================================================

export async function queryCustomTable(
  schemaId: string,
  organizationId: string,
  filters?: Record<string, any>,
  limit: number = 100
): Promise<any[]> {
  // Buscar schema
  const [schema] = await db
    .select()
    .from(documentSchemas)
    .where(eq(documentSchemas.id, schemaId))
    .limit(1)
  
  if (!schema) {
    throw new Error('Schema não encontrado')
  }
  
  // Gerar WHERE clause
  let whereClause = `organization_id = '${organizationId}'`
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      const field = (schema.fields as DocumentSchemaField[]).find(f => f.fieldName === key)
      if (field) {
        const formattedValue = formatValueForSQL(value, field.fieldType)
        whereClause += ` AND ${key} = ${formattedValue}`
      }
    })
  }
  
  // Query
  const query = `
    SELECT * FROM ${schema.tableName}
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  
  const result = await db.execute(sql.raw(query))
  return result.rows as any[]
}

