-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enums
CREATE TYPE file_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'rejected');
CREATE TYPE doc_type AS ENUM ('peticao_inicial', 'contestacao', 'recurso', 'parecer', 'contrato', 'modelo_generico', 'outro');
CREATE TYPE area AS ENUM ('civil', 'trabalhista', 'tributario', 'empresarial', 'consumidor', 'penal', 'administrativo', 'previdenciario', 'outro');
CREATE TYPE complexity AS ENUM ('simples', 'medio', 'complexo');

-- Create document_files table
CREATE TABLE document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  status file_status NOT NULL DEFAULT 'pending',
  rejected_reason TEXT,
  words_count INTEGER,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_file_id UUID NOT NULL REFERENCES document_files(id),
  title TEXT NOT NULL,
  doc_type doc_type NOT NULL,
  area area NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'BR',
  complexity complexity NOT NULL,
  tags TEXT[] DEFAULT '{}',
  summary TEXT NOT NULL,
  markdown TEXT NOT NULL,
  metadata JSONB,
  quality_score DECIMAL(5,2),
  is_gold BOOLEAN DEFAULT false,
  is_silver BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create template_chunks table
CREATE TABLE template_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id),
  section TEXT,
  role TEXT,
  content_markdown TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_document_files_file_path ON document_files(file_path);
CREATE INDEX idx_document_files_file_hash ON document_files(file_hash);
CREATE INDEX idx_document_files_status ON document_files(status);
CREATE INDEX idx_templates_doc_type ON templates(doc_type);
CREATE INDEX idx_templates_area ON templates(area);
CREATE INDEX idx_template_chunks_template_id ON template_chunks(template_id);

-- Create HNSW index for vector similarity search
CREATE INDEX idx_template_chunks_embedding_hnsw ON template_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

