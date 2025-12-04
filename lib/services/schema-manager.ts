import { db } from '../db'
import { documentSchemas, type DocumentSchema, type DocumentSchemaField } from '../db/schema/document-schemas'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import {
  generateCreateTableSQL,
  validateTableName,
  validateFields,
  generateDropTableSQL
} from './table-generator'

// Alias para compatibilidade
const customSchemas = documentSchemas
type CustomSchema = DocumentSchema
type FieldDefinition = DocumentSchemaField

// Client postgres para raw SQL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set')
}
const sqlClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  ssl: { rejectUnauthorized: false }
})

/**
 * Serviço para gerenciar schemas customizados
 */

/**
 * Lista schemas de uma organização
 */
export async function listSchemas(organizationId: string, baseType?: 'document' | 'sped' | 'csv') {
  const conditions = [eq(customSchemas.organizationId, organizationId)]
  
  if (baseType) {
    conditions.push(eq(customSchemas.baseType, baseType))
  }
  
  return await db
    .select()
    .from(customSchemas)
    .where(and(...conditions))
    .orderBy(customSchemas.createdAt)
}

/**
 * Busca schema por ID
 */
export async function getSchema(schemaId: string, organizationId: string) {
  const [schema] = await db
    .select()
    .from(customSchemas)
    .where(
      and(
        eq(customSchemas.id, schemaId),
        eq(customSchemas.organizationId, organizationId)
      )
    )
    .limit(1)
  
  return schema
}

/**
 * Busca schema por nome da tabela
 */
export async function getSchemaByTableName(tableName: string, organizationId: string) {
  const [schema] = await db
    .select()
    .from(customSchemas)
    .where(
      and(
        eq(customSchemas.tableName, tableName),
        eq(customSchemas.organizationId, organizationId)
      )
    )
    .limit(1)
  
  return schema
}

/**
 * Cria novo schema (sem criar tabela ainda)
 */
export async function createSchema(data: {
  organizationId: string
  name: string
  tableName: string
  description?: string
  baseType: 'document' | 'sped' | 'csv'
  category?: string
  fields: FieldDefinition[]
  enableRag?: boolean
  createdBy: string
}) {
  // Validações
  const tableValidation = validateTableName(data.tableName)
  if (!tableValidation.valid) {
    throw new Error(tableValidation.error)
  }
  
  const fieldsValidation = validateFields(data.fields)
  if (!fieldsValidation.valid) {
    throw new Error(fieldsValidation.errors.join('\n'))
  }
  
  // Verificar se tabela já existe
  const existing = await getSchemaByTableName(data.tableName, data.organizationId)
  if (existing) {
    throw new Error(`Tabela "${data.tableName}" já existe nesta organização`)
  }
  
  // Gerar SQL
  const createTableSql = generateCreateTableSQL(
    data.tableName,
    data.fields,
    data.organizationId
  )
  
  // Criar registro
  const [schema] = await db
    .insert(customSchemas)
    .values({
      organizationId: data.organizationId,
      name: data.name,
      tableName: data.tableName,
      description: data.description,
      baseType: data.baseType,
      category: data.category,
      fields: data.fields as any,
      sqlCreateStatement: createTableSql,
      sqlTableCreated: false,
      enableRAG: data.enableRag ?? true,
      createdBy: data.createdBy,
    })
    .returning()
  
  return schema
}

/**
 * Cria a tabela física no PostgreSQL
 */
export async function createPhysicalTable(schemaId: string, organizationId: string) {
  // Buscar schema
  const schema = await getSchema(schemaId, organizationId)
  if (!schema) {
    throw new Error('Schema não encontrado')
  }
  
  if (schema.sqlTableCreated) {
    throw new Error('Tabela já foi criada')
  }
  
  if (!schema.sqlCreateStatement) {
    throw new Error('SQL de criação não foi gerado')
  }
  
  // Executar CREATE TABLE usando postgres client direto
  try {
    await sqlClient.unsafe(schema.sqlCreateStatement || '')
    
    // Atualizar registro
    await db
      .update(customSchemas)
      .set({
        sqlTableCreated: true,
        sqlTableCreatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customSchemas.id, schemaId))
    
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar tabela física:', error)
    throw new Error(`Erro ao criar tabela no banco: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Atualiza schema (apenas se tabela ainda não foi criada)
 */
export async function updateSchema(
  schemaId: string,
  organizationId: string,
  data: {
  name?: string
  description?: string
  fields?: FieldDefinition[]
  enableRag?: boolean
  isActive?: boolean
  }
) {
  const schema = await getSchema(schemaId, organizationId)
  if (!schema) {
    throw new Error('Schema não encontrado')
  }
  
  // Não permitir edição de campos se tabela já foi criada
  if (schema.sqlTableCreated && data.fields) {
    throw new Error('Não é possível alterar campos de um schema cuja tabela já foi criada')
  }
  
  // Validar campos se fornecidos
  const updateData: any = {
    ...data,
    updatedAt: new Date()
  }
  
  if (data.fields) {
    const validation = validateFields(data.fields)
    if (!validation.valid) {
      throw new Error(validation.errors.join('\n'))
    }
    
    // Regerar SQL
    const createTableSql = generateCreateTableSQL(
      schema.tableName,
      data.fields,
      organizationId
    )
    
    updateData.sqlCreateStatement = createTableSql
  }
  
  const [updated] = await db
    .update(customSchemas)
    .set(updateData)
    .where(eq(customSchemas.id, schemaId))
    .returning()
  
  return updated
}

/**
 * Deleta schema (e opcionalmente a tabela física)
 */
export async function deleteSchema(
  schemaId: string,
  organizationId: string,
  dropTable: boolean = false
) {
  const schema = await getSchema(schemaId, organizationId)
  if (!schema) {
    throw new Error('Schema não encontrado')
  }
  
  // Deletar tabela física se solicitado
  if (dropTable && schema.sqlTableCreated) {
    const dropSQL = generateDropTableSQL(schema.tableName)
    await sqlClient.unsafe(dropSQL)
  }
  
  // Deletar registro do schema
  await db
    .delete(customSchemas)
    .where(eq(customSchemas.id, schemaId))
  
  return { success: true, tableDropped: dropTable && schema.sqlTableCreated }
}

/**
 * Lista todos os nomes de tabelas criadas por uma organização
 */
export async function listCreatedTables(organizationId: string) {
  const schemas = await db
    .select({
      id: customSchemas.id,
      name: customSchemas.name,
      tableName: customSchemas.tableName,
      baseType: customSchemas.baseType,
      tableCreated: customSchemas.sqlTableCreated,
      createdAt: customSchemas.createdAt
    })
    .from(customSchemas)
    .where(
      and(
        eq(customSchemas.organizationId, organizationId),
        eq(customSchemas.sqlTableCreated, true)
      )
    )
    .orderBy(customSchemas.name)
  
  return schemas
}

/**
 * Verifica se tabela existe fisicamente no BD
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  const validation = validateTableName(tableName)
  if (!validation.valid) {
    return false
  }
  
  const result = await sqlClient.unsafe(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `, [tableName])
  
  const rows = Array.isArray(result) ? result : []
  return rows.length > 0 && (rows[0] as any).exists
}

