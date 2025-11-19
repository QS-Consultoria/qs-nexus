import { pgTable, uuid, text, integer, timestamp, boolean, decimal, pgEnum, jsonb, customType } from 'drizzle-orm/pg-core';

// Define vector type for pgvector (1536 dimensions for text-embedding-3-small)
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    if (typeof value === 'string') {
      // Remove brackets and parse
      const cleaned = value.replace(/[\[\]]/g, '');
      return cleaned.split(',').map(Number);
    }
    return value;
  },
});

export const fileStatusEnum = pgEnum('file_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected'
]);

export const docTypeEnum = pgEnum('doc_type', [
  'peticao_inicial',
  'contestacao',
  'recurso',
  'parecer',
  'contrato',
  'modelo_generico',
  'outro'
]);

export const areaEnum = pgEnum('area', [
  'civil',
  'trabalhista',
  'tributario',
  'empresarial',
  'consumidor',
  'penal',
  'administrativo',
  'previdenciario',
  'outro'
]);

export const complexityEnum = pgEnum('complexity', [
  'simples',
  'medio',
  'complexo'
]);

export const documentFiles = pgTable('document_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  filePath: text('file_path').notNull().unique(),
  fileName: text('file_name').notNull(),
  fileHash: text('file_hash').notNull(),
  status: fileStatusEnum('status').notNull().default('pending'),
  rejectedReason: text('rejected_reason'),
  wordsCount: integer('words_count'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentFileId: uuid('document_file_id').notNull().references(() => documentFiles.id),
  title: text('title').notNull(),
  docType: docTypeEnum('doc_type').notNull(),
  area: areaEnum('area').notNull(),
  jurisdiction: text('jurisdiction').notNull().default('BR'),
  complexity: complexityEnum('complexity').notNull(),
  tags: text('tags').array().default([]),
  summary: text('summary').notNull(),
  markdown: text('markdown').notNull(),
  metadata: jsonb('metadata'),
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }),
  isGold: boolean('is_gold').default(false),
  isSilver: boolean('is_silver').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const templateChunks = pgTable('template_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => templates.id),
  section: text('section'),
  role: text('role'),
  contentMarkdown: text('content_markdown').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

