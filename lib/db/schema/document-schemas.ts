import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  pgEnum,
  decimal,
  integer,
} from 'drizzle-orm/pg-core'

// ================================================================
// Document Schemas - Definições customizáveis de estruturas de documentos
// ================================================================

// Enum para tipo base do documento
export const baseTypeEnum = pgEnum('base_type', ['document', 'sped', 'csv'])

// Enum para tipos de campos suportados
export const fieldTypeEnum = pgEnum('field_type', [
  'text',      // Texto curto (até 10k chars)
  'numeric',   // Número decimal
  'date',      // Data
  'boolean',   // Verdadeiro/Falso
])

// ================================================================
// Tabela: document_schemas
// Define estruturas customizáveis de documentos
// Admin cria schemas que geram tabelas SQL dinâmicas
// ================================================================
export const documentSchemas = pgTable(
  'document_schemas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Multi-tenant
    organizationId: uuid('organization_id').notNull(),
    
    // Identificação
    name: text('name').notNull(), // "Contratos de Prestação de Serviços"
    description: text('description'), // Descrição detalhada
    baseType: baseTypeEnum('base_type').notNull(), // document|sped|csv
    category: text('category'), // juridico, contabil, geral (opcional)
    
    // Configuração da tabela SQL
    tableName: text('table_name').notNull(), // contratos_prestacao
    
    // Definição dos campos (JSONB)
    // Array de: { fieldName, displayName, fieldType, isRequired, description, validationRules, defaultValue }
    fields: jsonb('fields').notNull().$type<DocumentSchemaField[]>(),
    
    // Configurações de processamento
    enableRAG: boolean('enable_rag').notNull().default(true), // Habilitar busca semântica?
    
    // Configuração de IA para classificação
    aiSystemPrompt: text('ai_system_prompt'), // Prompt customizado
    aiModelProvider: text('ai_model_provider').default('openai'), // openai|google
    aiModelName: text('ai_model_name').default('gpt-4'),
    aiTemperature: decimal('ai_temperature', { precision: 3, scale: 2 }).default('0.10'),
    aiMaxInputTokens: integer('ai_max_input_tokens').default(8000),
    aiMaxOutputTokens: integer('ai_max_output_tokens').default(2000),
    
    // Controle
    isActive: boolean('is_active').notNull().default(true),
    isDefaultForBaseType: boolean('is_default_for_base_type').default(false), // Padrão para este baseType?
    
    // Metadata de criação da tabela
    sqlTableCreated: boolean('sql_table_created').default(false), // Tabela SQL foi criada?
    sqlTableCreatedAt: timestamp('sql_table_created_at'),
    sqlCreateStatement: text('sql_create_statement'), // SQL usado para criar tabela (auditoria)
    
    // Estatísticas
    documentsProcessed: integer('documents_processed').default(0), // Quantos docs foram processados com este schema
    lastUsedAt: timestamp('last_used_at'),
    
    // Auditoria
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  table => ({
    orgIdx: index('document_schemas_org_idx').on(table.organizationId),
    baseTypeIdx: index('document_schemas_base_type_idx').on(table.baseType),
    activeIdx: index('document_schemas_active_idx').on(table.isActive),
    orgActiveIdx: index('document_schemas_org_active_idx').on(table.organizationId, table.isActive),
    tableNameIdx: index('document_schemas_table_name_idx').on(table.tableName),
    uniqueTableName: index('document_schemas_unique_table_name').on(table.organizationId, table.tableName),
  })
)

// ================================================================
// Tipos TypeScript
// ================================================================

export interface DocumentSchemaField {
  fieldName: string          // Nome do campo no BD (snake_case): "contratante", "valor_contrato"
  displayName: string        // Nome amigável: "Contratante", "Valor do Contrato"
  fieldType: 'text' | 'numeric' | 'date' | 'boolean'
  isRequired: boolean        // Campo obrigatório na classificação?
  description?: string       // Descrição/dica para a IA
  validationRules?: {        // Regras de validação
    min?: number            // Valor mínimo (numeric)
    max?: number            // Valor máximo (numeric)
    minLength?: number      // Tamanho mínimo (text)
    maxLength?: number      // Tamanho máximo (text)
    pattern?: string        // Regex (text)
  }
  defaultValue?: string      // Valor padrão se IA não extrair
  hint?: string             // Dica de onde encontrar no documento
}

export type DocumentSchema = typeof documentSchemas.$inferSelect
export type NewDocumentSchema = typeof documentSchemas.$inferInsert

// ================================================================
// Helper: Gera Zod Schema a partir de DocumentSchemaField[]
// ================================================================

export function generateZodSchemaFromFields(fields: DocumentSchemaField[]): string {
  const zodFields = fields.map(field => {
    let zodType = ''
    
    switch (field.fieldType) {
      case 'text':
        zodType = 'z.string()'
        if (field.validationRules?.minLength) {
          zodType += `.min(${field.validationRules.minLength})`
        }
        if (field.validationRules?.maxLength) {
          zodType += `.max(${field.validationRules.maxLength})`
        }
        if (field.validationRules?.pattern) {
          zodType += `.regex(/${field.validationRules.pattern}/)`
        }
        break
      
      case 'numeric':
        zodType = 'z.number()'
        if (field.validationRules?.min !== undefined) {
          zodType += `.min(${field.validationRules.min})`
        }
        if (field.validationRules?.max !== undefined) {
          zodType += `.max(${field.validationRules.max})`
        }
        break
      
      case 'date':
        zodType = 'z.string().datetime()' // ISO date string
        break
      
      case 'boolean':
        zodType = 'z.boolean()'
        break
    }
    
    // Se não é obrigatório, torna opcional
    if (!field.isRequired) {
      zodType += '.optional()'
    }
    
    // Adiciona descrição
    if (field.description) {
      zodType += `.describe("${field.description}")`
    }
    
    return `  ${field.fieldName}: ${zodType}`
  })
  
  return `{\n${zodFields.join(',\n')}\n}`
}

// ================================================================
// Helper: Gera SQL CREATE TABLE a partir de DocumentSchema
// ================================================================

export function generateCreateTableSQL(
  schema: DocumentSchema,
  organizationId: string
): string {
  const fields = schema.fields as DocumentSchemaField[]
  
  // Colunas customizadas
  const customColumns = fields.map(field => {
    let sqlType = ''
    
    switch (field.fieldType) {
      case 'text':
        sqlType = 'TEXT'
        break
      case 'numeric':
        sqlType = 'NUMERIC(15,2)'
        break
      case 'date':
        sqlType = 'DATE'
        break
      case 'boolean':
        sqlType = 'BOOLEAN'
        break
    }
    
    const notNull = field.isRequired ? ' NOT NULL' : ''
    const defaultVal = field.defaultValue ? ` DEFAULT '${field.defaultValue}'` : ''
    
    return `  ${field.fieldName} ${sqlType}${notNull}${defaultVal}`
  }).join(',\n')
  
  // Define qual coluna de FK usar baseado no baseType
  let foreignKeyColumn = ''
  let foreignKeyTable = ''
  
  switch (schema.baseType) {
    case 'document':
      foreignKeyColumn = 'document_id'
      foreignKeyTable = 'documents'
      break
    case 'sped':
      foreignKeyColumn = 'sped_file_id'
      foreignKeyTable = 'sped_files'
      break
    case 'csv':
      foreignKeyColumn = 'csv_import_id'
      foreignKeyTable = 'csv_imports'
      break
  }
  
  const sql = `
-- Schema: ${schema.name}
-- Base Type: ${schema.baseType}
-- Created by: QS Nexus Schema Migration Engine

CREATE TABLE IF NOT EXISTS ${schema.tableName} (
  -- Colunas obrigatórias do sistema
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ${foreignKeyColumn} UUID NOT NULL,
  processed_document_id UUID,
  organization_id UUID NOT NULL,
  
  -- Campos customizados
${customColumns},
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  
  -- Foreign Keys
  CONSTRAINT fk_${schema.tableName}_org 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id),
    
  CONSTRAINT fk_${schema.tableName}_source 
    FOREIGN KEY (${foreignKeyColumn}) 
    REFERENCES ${foreignKeyTable}(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_${schema.tableName}_processed 
    FOREIGN KEY (processed_document_id) 
    REFERENCES processed_documents(id) 
    ON DELETE SET NULL
);

-- Índices automáticos
CREATE INDEX IF NOT EXISTS idx_${schema.tableName}_org 
  ON ${schema.tableName}(organization_id);

CREATE INDEX IF NOT EXISTS idx_${schema.tableName}_source 
  ON ${schema.tableName}(${foreignKeyColumn});

CREATE INDEX IF NOT EXISTS idx_${schema.tableName}_processed 
  ON ${schema.tableName}(processed_document_id);

CREATE INDEX IF NOT EXISTS idx_${schema.tableName}_created 
  ON ${schema.tableName}(created_at DESC);

-- Comentário da tabela
COMMENT ON TABLE ${schema.tableName} IS 'Schema: ${schema.name} | Base: ${schema.baseType} | Org: ${organizationId}';
`.trim()
  
  return sql
}

