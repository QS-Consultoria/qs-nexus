import { sql } from 'drizzle-orm'
import { db } from '../db'
import { documentSchemas, generateCreateTableSQL, type DocumentSchema, type DocumentSchemaField } from '../db/schema/document-schemas'
import { eq, and } from 'drizzle-orm'

/**
 * Schema Migration Engine
 * 
 * Responsável por:
 * 1. Criar tabelas SQL dinâmicas baseadas em schemas definidos por admins
 * 2. Validar schemas antes de criar tabelas
 * 3. Gerenciar lifecycle de schemas (ativar/desativar)
 */

// ================================================================
// Validação de Schemas
// ================================================================

export interface SchemaValidationError {
  field: string
  message: string
}

export function validateDocumentSchema(
  schema: Partial<DocumentSchema>,
  fields: DocumentSchemaField[]
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = []
  
  // Validar nome
  if (!schema.name || schema.name.trim().length < 3) {
    errors.push({ field: 'name', message: 'Nome deve ter pelo menos 3 caracteres' })
  }
  
  // Validar table name
  if (!schema.tableName) {
    errors.push({ field: 'tableName', message: 'Nome da tabela é obrigatório' })
  } else {
    // Validar formato: apenas letras, números e underscore
    if (!/^[a-z][a-z0-9_]*$/.test(schema.tableName)) {
      errors.push({ 
        field: 'tableName', 
        message: 'Nome da tabela deve começar com letra e conter apenas letras minúsculas, números e underscore' 
      })
    }
    
    // Validar que não é palavra reservada SQL
    const reservedWords = ['user', 'table', 'select', 'insert', 'update', 'delete', 'where', 'from', 'join']
    if (reservedWords.includes(schema.tableName)) {
      errors.push({ 
        field: 'tableName', 
        message: `"${schema.tableName}" é uma palavra reservada SQL. Escolha outro nome.` 
      })
    }
  }
  
  // Validar baseType
  if (!schema.baseType) {
    errors.push({ field: 'baseType', message: 'Tipo base é obrigatório' })
  }
  
  // Validar fields
  if (!fields || fields.length === 0) {
    errors.push({ field: 'fields', message: 'Deve haver pelo menos 1 campo customizado' })
  } else {
    if (fields.length > 50) {
      errors.push({ field: 'fields', message: 'Máximo de 50 campos por schema' })
    }
    
    const fieldNames = new Set<string>()
    fields.forEach((field, index) => {
      // Validar field name
      if (!field.fieldName || !/^[a-z][a-z0-9_]*$/.test(field.fieldName)) {
        errors.push({ 
          field: `fields[${index}].fieldName`, 
          message: 'Nome do campo deve começar com letra e conter apenas letras minúsculas, números e underscore' 
        })
      }
      
      // Validar duplicatas
      if (fieldNames.has(field.fieldName)) {
        errors.push({ 
          field: `fields[${index}].fieldName`, 
          message: `Campo "${field.fieldName}" duplicado` 
        })
      }
      fieldNames.add(field.fieldName)
      
      // Validar display name
      if (!field.displayName || field.displayName.trim().length === 0) {
        errors.push({ 
          field: `fields[${index}].displayName`, 
          message: 'Nome de exibição é obrigatório' 
        })
      }
      
      // Validar field type
      if (!['text', 'numeric', 'date', 'boolean'].includes(field.fieldType)) {
        errors.push({ 
          field: `fields[${index}].fieldType`, 
          message: `Tipo "${field.fieldType}" não suportado. Use: text, numeric, date, boolean` 
        })
      }
    })
  }
  
  return errors
}

// ================================================================
// Criação de Tabelas Dinâmicas
// ================================================================

export async function createDynamicTable(
  schemaId: string,
  organizationId: string,
  createdBy: string
): Promise<{ success: boolean; error?: string; tableName?: string }> {
  try {
    // Buscar schema
    const [schema] = await db
      .select()
      .from(documentSchemas)
      .where(
        and(
          eq(documentSchemas.id, schemaId),
          eq(documentSchemas.organizationId, organizationId)
        )
      )
      .limit(1)
    
    if (!schema) {
      return { success: false, error: 'Schema não encontrado' }
    }
    
    if (schema.sqlTableCreated) {
      return { success: false, error: 'Tabela já foi criada para este schema' }
    }
    
    // Validar schema
    const validationErrors = validateDocumentSchema(schema, schema.fields as DocumentSchemaField[])
    if (validationErrors.length > 0) {
      return { 
        success: false, 
        error: `Erros de validação: ${validationErrors.map(e => e.message).join(', ')}` 
      }
    }
    
    // Gerar SQL
    const createTableSQL = generateCreateTableSQL(schema, organizationId)
    
    console.log(`[SCHEMA-ENGINE] Criando tabela ${schema.tableName}...`)
    console.log(`[SCHEMA-ENGINE] SQL:\n${createTableSQL}`)
    
    // Executar CREATE TABLE
    await db.execute(sql.raw(createTableSQL))
    
    console.log(`[SCHEMA-ENGINE] ✅ Tabela ${schema.tableName} criada com sucesso`)
    
    // Atualizar schema metadata
    await db
      .update(documentSchemas)
      .set({
        sqlTableCreated: true,
        sqlTableCreatedAt: new Date(),
        sqlCreateStatement: createTableSQL,
        updatedAt: new Date(),
        updatedBy: createdBy,
      })
      .where(eq(documentSchemas.id, schemaId))
    
    return { 
      success: true, 
      tableName: schema.tableName 
    }
    
  } catch (error: any) {
    console.error('[SCHEMA-ENGINE] ❌ Erro ao criar tabela:', error)
    
    // Erros comuns do PostgreSQL
    if (error.code === '42P07') {
      return { success: false, error: 'Tabela já existe no banco de dados' }
    }
    if (error.code === '42601') {
      return { success: false, error: 'Erro de sintaxe SQL' }
    }
    
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao criar tabela' 
    }
  }
}

// ================================================================
// Listagem e Gerenciamento
// ================================================================

export async function listDocumentSchemas(organizationId: string, baseType?: string) {
  const conditions = [eq(documentSchemas.organizationId, organizationId)]
  
  if (baseType) {
    conditions.push(eq(documentSchemas.baseType, baseType as any))
  }
  
  return await db
    .select()
    .from(documentSchemas)
    .where(and(...conditions))
    .orderBy(documentSchemas.createdAt)
}

export async function getActiveSchemaForBaseType(
  organizationId: string,
  baseType: 'document' | 'sped' | 'csv'
): Promise<DocumentSchema | null> {
  const [schema] = await db
    .select()
    .from(documentSchemas)
    .where(
      and(
        eq(documentSchemas.organizationId, organizationId),
        eq(documentSchemas.baseType, baseType),
        eq(documentSchemas.isActive, true),
        eq(documentSchemas.isDefaultForBaseType, true)
      )
    )
    .limit(1)
  
  return schema || null
}

// ================================================================
// Desativação de Schema (não deleta tabela, apenas marca como inativo)
// ================================================================

export async function deactivateSchema(schemaId: string, organizationId: string) {
  await db
    .update(documentSchemas)
    .set({ 
      isActive: false,
      updatedAt: new Date() 
    })
    .where(
      and(
        eq(documentSchemas.id, schemaId),
        eq(documentSchemas.organizationId, organizationId)
      )
    )
}

// ================================================================
// Estatísticas
// ================================================================

export async function incrementSchemaUsage(schemaId: string) {
  await db.execute(sql.raw(`
    UPDATE document_schemas 
    SET 
      documents_processed = documents_processed + 1,
      last_used_at = NOW()
    WHERE id = '${schemaId}'
  `))
}

