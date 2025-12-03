import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core'

// ================================================================
// Documents Schema - Documentos gerais (PDF, DOCX, TXT)
// ================================================================

// Enum para tipo de documento
export const documentTypeEnum = pgEnum('document_type', [
  'pdf',
  'docx',
  'doc',
  'txt',
  'other',
])

// Enum para status de processamento
export const documentStatusEnum = pgEnum('document_status', [
  'pending',    // Upload feito, aguardando processamento
  'processing', // Sendo processado (RAG pipeline)
  'completed',  // Processado com sucesso
  'failed',     // Erro no processamento
])

// ================================================================
// Tabela: documents - Documentos gerais para RAG
// ================================================================
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Multi-tenant
    organizationId: uuid('organization_id').notNull(), // FILTRO PRINCIPAL
    uploadedBy: uuid('uploaded_by').notNull(),
    
    // Identificação
    fileName: text('file_name').notNull(),
    originalFileName: text('original_file_name').notNull(),
    filePath: text('file_path').notNull(),
    fileSize: integer('file_size').notNull(), // bytes
    fileHash: text('file_hash').notNull(),
    mimeType: text('mime_type').notNull(),
    documentType: documentTypeEnum('document_type').notNull(),
    
    // Metadados
    title: text('title'), // Extraído ou definido pelo usuário
    description: text('description'),
    tags: text('tags').array(), // Para categorização
    metadata: jsonb('metadata'), // Metadados extras (autor, data criação, etc)
    
    // Processamento RAG
    status: documentStatusEnum('status').notNull().default('pending'),
    errorMessage: text('error_message'),
    processedAt: timestamp('processed_at'),
    
    // Contadores
    totalChunks: integer('total_chunks').default(0),
    totalTokens: integer('total_tokens').default(0),
    
    // Soft delete
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    deletedBy: uuid('deleted_by'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    orgIdx: index('documents_org_idx').on(table.organizationId),
    uploadedByIdx: index('documents_uploaded_by_idx').on(table.uploadedBy),
    statusIdx: index('documents_status_idx').on(table.status),
    typeIdx: index('documents_type_idx').on(table.documentType),
    activeIdx: index('documents_active_idx').on(table.isActive),
    orgActiveIdx: index('documents_org_active_idx').on(table.organizationId, table.isActive),
  })
)

// ================================================================
// Types exportados
// ================================================================
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert

