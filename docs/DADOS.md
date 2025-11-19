# Estrutura de Dados

## Schema do Banco de Dados

### Tabela: `document_files`

Tracking de arquivos DOCX processados.

```sql
CREATE TABLE document_files (
  id UUID PRIMARY KEY,
  file_path TEXT UNIQUE,        -- Caminho relativo ao root
  file_name TEXT,
  file_hash TEXT,               -- SHA256 para detectar mudanças
  status file_status,           -- pending, processing, completed, failed, rejected
  rejected_reason TEXT,
  words_count INTEGER,
  processed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Tabela: `templates`

Documentos processados completos (TemplateDocument).

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  document_file_id UUID REFERENCES document_files(id),
  title TEXT,
  doc_type doc_type,            -- peticao_inicial, contestacao, etc.
  area area,                    -- civil, trabalhista, etc.
  jurisdiction TEXT,            -- 'BR', 'TRT1', etc.
  complexity complexity,        -- simples, medio, complexo
  tags TEXT[],
  summary TEXT,                 -- Resumo otimizado para embedding
  markdown TEXT,               -- Conteúdo completo em Markdown
  metadata JSONB,
  quality_score DECIMAL(5,2),  -- 0-100
  is_gold BOOLEAN,
  is_silver BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Tabela: `template_chunks`

Chunks individuais com embeddings.

```sql
CREATE TABLE template_chunks (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES templates(id),
  section TEXT,                 -- Nome da seção (ex: "Dos Fatos")
  role TEXT,                   -- intro, fundamentacao, pedido, etc.
  content_markdown TEXT,        -- Conteúdo do chunk em Markdown
  chunk_index INTEGER,         -- Ordem no documento
  embedding vector(1536),       -- Embedding do chunk
  created_at TIMESTAMP
);
```

### Índices

```sql
-- Índices B-tree
CREATE INDEX idx_document_files_file_path ON document_files(file_path);
CREATE INDEX idx_document_files_status ON document_files(status);
CREATE INDEX idx_templates_doc_type ON templates(doc_type);
CREATE INDEX idx_templates_area ON templates(area);
CREATE INDEX idx_template_chunks_template_id ON template_chunks(template_id);

-- Índice HNSW para busca vetorial
CREATE INDEX idx_template_chunks_embedding_hnsw ON template_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

## Enums

### file_status
- `pending`: Aguardando processamento
- `processing`: Em processamento
- `completed`: Processado com sucesso
- `failed`: Falhou no processamento
- `rejected`: Rejeitado (nunca será reprocessado)

### doc_type
- `peticao_inicial`
- `contestacao`
- `recurso`
- `parecer`
- `contrato`
- `modelo_generico`
- `outro`

### area
- `civil`
- `trabalhista`
- `tributario`
- `empresarial`
- `consumidor`
- `penal`
- `administrativo`
- `previdenciario`
- `outro`

### complexity
- `simples`
- `medio`
- `complexo`

## Operações de Busca

### Busca por Similaridade Vetorial

```sql
-- Busca chunks similares a uma query
SELECT 
  tc.content_markdown,
  t.title,
  t.doc_type,
  t.area,
  1 - (tc.embedding <=> $1::vector) as similarity
FROM template_chunks tc
JOIN templates t ON t.id = tc.template_id
WHERE t.area = 'civil'  -- Filtro opcional
ORDER BY tc.embedding <=> $1::vector
LIMIT 10;
```

### Busca por Template

```sql
-- Buscar todos os chunks de um template
SELECT *
FROM template_chunks
WHERE template_id = $1
ORDER BY chunk_index;
```

### Estatísticas de Processamento

```sql
-- Status geral
SELECT 
  status,
  COUNT(*) as total
FROM document_files
GROUP BY status;
```

## Relatório de Status

O arquivo `processing-status.json` contém:

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "summary": {
    "total": 1000,
    "pending": 50,
    "processing": 5,
    "completed": 900,
    "failed": 10,
    "rejected": 35,
    "progress": 90
  },
  "files": [...],
  "rejectedFiles": [...]
}
```

## Migração de Dados Antigos

Se você tiver dados do sistema Python antigo:

1. **JSONL antigo**: Não é mais usado, dados estão no banco
2. **CSV antigo**: Pode ser usado como referência, mas não é necessário
3. **Embeddings antigos**: Precisam ser regenerados com o novo sistema

## Validação

### Verificar Integridade

```sql
-- Verificar templates sem chunks
SELECT t.id, t.title
FROM templates t
LEFT JOIN template_chunks tc ON tc.template_id = t.id
WHERE tc.id IS NULL;

-- Verificar chunks sem embeddings
SELECT COUNT(*)
FROM template_chunks
WHERE embedding IS NULL;
```
