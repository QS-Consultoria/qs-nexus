import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  pgEnum,
  jsonb,
  customType,
} from 'drizzle-orm/pg-core'

// Define vector type for pgvector (1536 dimensions for text-embedding-3-small)
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    if (typeof value === 'string') {
      // Remove brackets and parse
      const cleaned = value.replace(/[\[\]]/g, '')
      return cleaned.split(',').map(Number)
    }
    return value
  },
})

export const fileStatusEnum = pgEnum('file_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected',
])

export const docTypeEnum = pgEnum('doc_type', [
  'peticao_inicial',
  'contestacao',
  'recurso',
  'parecer',
  'contrato',
  'modelo_generico',
  'outro',
])

export const areaEnum = pgEnum('area', [
  'civil',
  'trabalhista',
  'tributario',
  'empresarial',
  'consumidor',
  'penal',
  'administrativo',
  'previdenciario',
  'outro',
])

export const complexityEnum = pgEnum('complexity', ['simples', 'medio', 'complexo'])

// Model provider enum for classification configs
export const modelProviderEnum = pgEnum('model_provider', ['openai', 'google'])

export const documentFiles = pgTable('document_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant
  organizationId: uuid('organization_id'),
  createdBy: uuid('created_by'),
  
  filePath: text('file_path').notNull().unique(),
  fileName: text('file_name').notNull(),
  fileHash: text('file_hash').notNull(),
  status: fileStatusEnum('status').notNull().default('pending'),
  rejectedReason: text('rejected_reason'),
  wordsCount: integer('words_count'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Classification configs table
export const classificationConfigs = pgTable('classification_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant (null = global config)
  organizationId: uuid('organization_id'),
  
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  modelProvider: modelProviderEnum('model_provider').notNull(),
  modelName: text('model_name').notNull(),
  maxInputTokens: integer('max_input_tokens').notNull(),
  maxOutputTokens: integer('max_output_tokens').notNull(),
  extractionFunctionCode: text('extraction_function_code'),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Template schema configs table
export const templateSchemaConfigs = pgTable('template_schema_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant (null = global schema)
  organizationId: uuid('organization_id'),
  
  name: text('name').notNull(),
  fields: jsonb('fields').notNull(), // Array of field definitions
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Refactored templates table - using JSONB metadata instead of fixed columns
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant
  organizationId: uuid('organization_id'),
  createdBy: uuid('created_by'),
  
  documentFileId: uuid('document_file_id')
    .notNull()
    .references(() => documentFiles.id),
  title: text('title').notNull(),
  markdown: text('markdown').notNull(),
  metadata: jsonb('metadata'), // All configurable fields stored here
  schemaConfigId: uuid('schema_config_id').references(() => templateSchemaConfigs.id),
  modelProvider: modelProviderEnum('model_provider'), // Provider usado na classificação (openai, google)
  modelName: text('model_name'), // Nome do modelo usado na classificação
  inputTokens: integer('input_tokens'), // Número de tokens de input usados na classificação
  outputTokens: integer('output_tokens'), // Número de tokens de output usados na classificação
  costUsd: decimal('cost_usd', { precision: 10, scale: 4 }), // Custo total em USD (nullable para compatibilidade)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const templateChunks = pgTable('template_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templates.id),
  section: text('section'),
  role: text('role'),
  contentMarkdown: text('content_markdown').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
