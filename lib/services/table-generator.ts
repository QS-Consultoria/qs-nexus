import { DocumentSchemaField } from '../db/schema/document-schemas'

// Alias para compatibilidade com código existente
type FieldDefinition = DocumentSchemaField

// Colunas obrigatórias do sistema (sempre incluídas em tabelas dinâmicas)
export const SYSTEM_COLUMNS = [
  'id',
  'organization_id',
  'document_id',
  'sped_file_id',
  'csv_import_id',
  'processed_document_id',
  'extracted_at',
  'extracted_by',
  'source_file_path',
  'confidence_score',
  'metadata',
  'created_at',
  'updated_at'
] as const

// Nomes reservados
export const RESERVED_FIELD_NAMES = new Set([
  ...SYSTEM_COLUMNS,
  // SQL keywords
  'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
  'table', 'index', 'view', 'schema', 'database', 'user', 'role',
  'grant', 'revoke', 'where', 'from', 'join', 'group', 'order', 'limit',
  // PostgreSQL reserved
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc',
  'between', 'both', 'case', 'cast', 'check', 'constraint', 'current',
  'default', 'desc', 'distinct', 'else', 'end', 'false', 'for', 'foreign',
  'having', 'in', 'into', 'is', 'leading', 'like', 'not', 'null', 'on',
  'only', 'or', 'primary', 'references', 'returning', 'then', 'to', 'true',
  'union', 'unique', 'when', 'with'
])

/**
 * Serviço para gerar CREATE TABLE SQL a partir de schemas dinâmicos
 */

/**
 * Valida nome de tabela (previne SQL injection)
 */
export function validateTableName(tableName: string): { valid: boolean; error?: string } {
  // Deve ser snake_case, começar com letra, apenas letras, números e underscore
  const regex = /^[a-z][a-z0-9_]*$/
  
  if (!regex.test(tableName)) {
    return {
      valid: false,
      error: 'Nome da tabela deve começar com letra minúscula e conter apenas letras, números e underscore (snake_case)'
    }
  }
  
  if (tableName.length > 63) {
    return {
      valid: false,
      error: 'Nome da tabela não pode ter mais de 63 caracteres'
    }
  }
  
  // Não pode começar com pg_ (reservado PostgreSQL)
  if (tableName.startsWith('pg_')) {
    return {
      valid: false,
      error: 'Nome da tabela não pode começar com "pg_" (reservado pelo PostgreSQL)'
    }
  }
  
  return { valid: true }
}

/**
 * Valida nome de campo
 */
export function validateFieldName(fieldName: string): { valid: boolean; error?: string } {
  // Mesmas regras de tabela
  const regex = /^[a-z][a-z0-9_]*$/
  
  if (!regex.test(fieldName)) {
    return {
      valid: false,
      error: 'Nome do campo deve começar com letra minúscula e conter apenas letras, números e underscore'
    }
  }
  
  if (fieldName.length > 63) {
    return {
      valid: false,
      error: 'Nome do campo não pode ter mais de 63 caracteres'
    }
  }
  
  // Verificar se é nome reservado
  if (RESERVED_FIELD_NAMES.has(fieldName.toLowerCase())) {
    return {
      valid: false,
      error: `"${fieldName}" é um nome reservado e não pode ser usado`
    }
  }
  
  return { valid: true }
}

/**
 * Valida array de campos
 */
export function validateFields(fields: FieldDefinition[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const fieldNames = new Set<string>()
  
  if (fields.length === 0) {
    errors.push('Schema deve ter pelo menos 1 campo customizado')
  }
  
  if (fields.length > 50) {
    errors.push('Schema não pode ter mais de 50 campos customizados')
  }
  
  for (const field of fields) {
    // Validar nome
    const nameValidation = validateFieldName(field.fieldName)
    if (!nameValidation.valid) {
      errors.push(`Campo "${field.displayName}": ${nameValidation.error}`)
      continue
    }
    
    // Verificar duplicados
    if (fieldNames.has(field.fieldName)) {
      errors.push(`Campo "${field.fieldName}" está duplicado`)
    }
    fieldNames.add(field.fieldName)
    
    // Validar displayName
    if (!field.displayName || field.displayName.trim() === '') {
      errors.push(`Campo "${field.fieldName}" precisa de um displayName`)
    }
    
    // Validar tipo (usando tipos do DocumentSchemaField)
    const validTypes = ['text', 'numeric', 'date', 'boolean']
    if (!validTypes.includes(field.fieldType)) {
      errors.push(`Campo "${field.fieldName}": tipo "${field.fieldType}" inválido`)
    }
    
    // Validar maxLength para text
    if (field.fieldType === 'text' && field.validationRules?.maxLength) {
      if (field.validationRules.maxLength < 1 || field.validationRules.maxLength > 10000) {
        errors.push(`Campo "${field.fieldName}": maxLength deve estar entre 1 e 10000`)
      }
    }
    
    // Validar min/max para numeric
    if (field.fieldType === 'numeric' && field.validationRules) {
      if (field.validationRules.min !== undefined && field.validationRules.max !== undefined && field.validationRules.min > field.validationRules.max) {
        errors.push(`Campo "${field.fieldName}": min não pode ser maior que max`)
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Gera SQL para criar coluna customizada
 */
function generateColumnSQL(field: FieldDefinition): string {
  let sql = `${field.fieldName} `
  
  // Tipo de dado
  switch (field.fieldType) {
    case 'text':
      const maxLength = field.validationRules?.maxLength
      sql += maxLength && maxLength <= 255
        ? `VARCHAR(${maxLength})`
        : 'TEXT'
      break
    case 'numeric':
      sql += 'DECIMAL(15,2)'
      break
    case 'date':
      sql += 'DATE'
      break
    case 'boolean':
      sql += 'BOOLEAN'
      break
  }
  
  // NOT NULL
  if (field.isRequired) {
    sql += ' NOT NULL'
  }
  
  // DEFAULT
  if (field.defaultValue !== undefined) {
    if (field.fieldType === 'text' || field.fieldType === 'date') {
      sql += ` DEFAULT '${String(field.defaultValue).replace(/'/g, "''")}'`
    } else if (field.fieldType === 'boolean') {
      sql += ` DEFAULT ${field.defaultValue ? 'TRUE' : 'FALSE'}`
    } else {
      sql += ` DEFAULT ${field.defaultValue}`
    }
  }
  
  return sql
}

/**
 * Gera CREATE TABLE SQL completo
 */
export function generateCreateTableSQL(
  tableName: string,
  fields: FieldDefinition[],
  organizationId: string
): string {
  // Validações
  const tableValidation = validateTableName(tableName)
  if (!tableValidation.valid) {
    throw new Error(`Nome de tabela inválido: ${tableValidation.error}`)
  }
  
  const fieldsValidation = validateFields(fields)
  if (!fieldsValidation.valid) {
    throw new Error(`Campos inválidos:\n${fieldsValidation.errors.join('\n')}`)
  }
  
  // Colunas do sistema (sempre incluídas)
  const systemColumns = [
    'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    'organization_id UUID NOT NULL',
    'document_id UUID',  // FK para documents/sped_files/csv_imports
    'processed_document_id UUID',  // FK para processed_documents
    'extracted_at TIMESTAMP DEFAULT NOW()',
    'extracted_by UUID',
    'source_file_path TEXT',
    'confidence_score DECIMAL(3,2)',  // 0.00 a 1.00
    'metadata JSONB'  // Backup completo dos dados extraídos
  ]
  
  // Colunas customizadas
  const customColumns = fields.map(field => generateColumnSQL(field))
  
  // Constraints
  const constraints = [
    `CONSTRAINT fk_${tableName}_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE`,
    `CONSTRAINT fk_${tableName}_processed_doc FOREIGN KEY (processed_document_id) REFERENCES templates(id) ON DELETE SET NULL`
  ]
  
  // Índices
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_${tableName}_org ON ${tableName}(organization_id);`,
    `CREATE INDEX IF NOT EXISTS idx_${tableName}_doc ON ${tableName}(document_id);`,
    `CREATE INDEX IF NOT EXISTS idx_${tableName}_processed ON ${tableName}(processed_document_id);`,
    `CREATE INDEX IF NOT EXISTS idx_${tableName}_extracted_at ON ${tableName}(extracted_at DESC);`
  ]
  
  // Monta CREATE TABLE
  const createTableSQL = `
-- Tabela customizada: ${tableName}
-- Criada automaticamente pelo sistema de schemas dinâmicos
-- Organização: ${organizationId}

CREATE TABLE IF NOT EXISTS ${tableName} (
  ${systemColumns.join(',\n  ')},
  ${customColumns.join(',\n  ')},
  ${constraints.join(',\n  ')}
);

${indexes.join('\n')}

-- Comentários
COMMENT ON TABLE ${tableName} IS 'Tabela customizada para dados extraídos de documentos';
COMMENT ON COLUMN ${tableName}.id IS 'ID único do registro';
COMMENT ON COLUMN ${tableName}.organization_id IS 'Organização proprietária';
COMMENT ON COLUMN ${tableName}.document_id IS 'ID do documento original (documents/sped_files/csv_imports)';
COMMENT ON COLUMN ${tableName}.processed_document_id IS 'ID do documento processado (templates)';
COMMENT ON COLUMN ${tableName}.confidence_score IS 'Confiança da extração (0.00 a 1.00)';
COMMENT ON COLUMN ${tableName}.metadata IS 'Backup completo dos dados extraídos em JSON';
`.trim()
  
  return createTableSQL
}

/**
 * Gera SQL para inserir dados na tabela customizada
 */
export function generateInsertSQL(
  tableName: string,
  fields: FieldDefinition[],
  extractedData: Record<string, any>,
  systemData: {
    organizationId: string
    documentId?: string
    processedDocumentId?: string
    extractedBy: string
    sourceFilePath: string
    confidenceScore: number
  }
): { sql: string; values: any[] } {
  // Validar nome da tabela
  const validation = validateTableName(tableName)
  if (!validation.valid) {
    throw new Error(`Nome de tabela inválido: ${validation.error}`)
  }
  
  // Colunas e valores
  const columns: string[] = []
  const placeholders: string[] = []
  const values: any[] = []
  let paramIndex = 1
  
  // Adicionar colunas do sistema
  columns.push('organization_id', 'document_id', 'processed_document_id', 'extracted_by', 'source_file_path', 'confidence_score', 'metadata')
  placeholders.push(`$${paramIndex++}`, `$${paramIndex++}`, `$${paramIndex++}`, `$${paramIndex++}`, `$${paramIndex++}`, `$${paramIndex++}`, `$${paramIndex++}`)
  values.push(
    systemData.organizationId,
    systemData.documentId || null,
    systemData.processedDocumentId || null,
    systemData.extractedBy,
    systemData.sourceFilePath,
    systemData.confidenceScore,
    JSON.stringify(extractedData)  // Backup completo
  )
  
  // Adicionar campos customizados
  for (const field of fields) {
    const value = extractedData[field.fieldName]
    
    // Pular se não obrigatório e valor ausente
    if (!field.isRequired && (value === undefined || value === null || value === '')) {
      continue
    }
    
    columns.push(field.fieldName)
    placeholders.push(`$${paramIndex++}`)
    
    // Converter valor se necessário
    if (field.fieldType === 'numeric') {
      values.push(value !== undefined && value !== null ? Number(value) : null)
    } else if (field.fieldType === 'boolean') {
      values.push(value !== undefined && value !== null ? Boolean(value) : null)
    } else if (field.fieldType === 'date') {
      // Aceita string de data ou Date object
      values.push(value || null)
    } else {
      // text
      values.push(value !== undefined && value !== null ? String(value) : null)
    }
  }
  
  const sql = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *;
  `.trim()
  
  return { sql, values }
}

/**
 * Gera SQL para DROP TABLE (se necessário deletar)
 */
export function generateDropTableSQL(tableName: string): string {
  const validation = validateTableName(tableName)
  if (!validation.valid) {
    throw new Error(`Nome de tabela inválido: ${validation.error}`)
  }
  
  return `DROP TABLE IF EXISTS ${tableName} CASCADE;`
}

/**
 * Gera SQL para consultar dados da tabela customizada
 */
export function generateSelectSQL(
  tableName: string,
  organizationId: string,
  options?: {
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'ASC' | 'DESC'
    where?: Record<string, any>
  }
): { sql: string; values: any[] } {
  const validation = validateTableName(tableName)
  if (!validation.valid) {
    throw new Error(`Nome de tabela inválido: ${validation.error}`)
  }
  
  const values: any[] = [organizationId]
  let paramIndex = 2
  
  let sql = `SELECT * FROM ${tableName} WHERE organization_id = $1`
  
  // WHERE adicional
  if (options?.where) {
    for (const [key, value] of Object.entries(options.where)) {
      const fieldValidation = validateFieldName(key)
      if (!fieldValidation.valid) continue
      
      sql += ` AND ${key} = $${paramIndex++}`
      values.push(value)
    }
  }
  
  // ORDER BY
  if (options?.orderBy) {
    const fieldValidation = validateFieldName(options.orderBy)
    if (fieldValidation.valid) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'DESC'}`
    }
  } else {
    sql += ` ORDER BY extracted_at DESC`
  }
  
  // LIMIT/OFFSET
  if (options?.limit) {
    sql += ` LIMIT ${Math.min(options.limit, 1000)}`
  } else {
    sql += ` LIMIT 100`
  }
  
  if (options?.offset) {
    sql += ` OFFSET ${options.offset}`
  }
  
  return { sql, values }
}

