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

### Tabela: `templates` (Refatorada)

Documentos processados completos com schema dinâmico.

**Migração**: Colunas fixas (doc_type, area, complexity, etc.) foram migradas para `metadata` JSONB.

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  document_file_id UUID REFERENCES document_files(id),
  title TEXT NOT NULL,
  markdown TEXT NOT NULL,
  metadata JSONB,              -- Todos os campos configuráveis (docType, area, etc.)
  schema_config_id UUID REFERENCES template_schema_configs(id),
  model_provider model_provider, -- Provider usado na classificação ('openai' | 'google')
  model_name TEXT,              -- Nome do modelo usado na classificação
  input_tokens INTEGER,         -- Tokens de input usados na classificação
  output_tokens INTEGER,        -- Tokens de output usados na classificação
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Campos em metadata** (exemplo do schema padrão):
- `docType`: string (enum)
- `area`: string (enum)
- `jurisdiction`: string
- `complexity`: string (enum)
- `tags`: array de strings
- `summary`: string
- `qualityScore`: number
- `isGold`: boolean
- `isSilver`: boolean

**Nota**: Os campos em `metadata` são definidos dinamicamente pelo `template_schema_configs` associado.

### Tabela: `classification_configs` (Nova)

Configurações de classificação de documentos.

```sql
CREATE TABLE classification_configs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model_provider model_provider NOT NULL,  -- 'openai' | 'google'
  model_name TEXT NOT NULL,
  max_input_tokens INTEGER NOT NULL,
  max_output_tokens INTEGER NOT NULL,
  extraction_function_code TEXT,           -- Código JavaScript customizado (opcional)
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Tabela: `template_schema_configs` (Nova)

Schemas de template configuráveis.

```sql
CREATE TABLE template_schema_configs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  fields JSONB NOT NULL,        -- Array de definições de campos
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Estrutura de `fields`** (JSONB):
```json
[
  {
    "name": "docType",
    "type": "enum",
    "enumValues": ["peticao_inicial", "contestacao", "recurso", ...],
    "required": true,
    "description": "Tipo do documento"
  },
  {
    "name": "area",
    "type": "enum",
    "enumValues": ["civil", "trabalhista", "tributario", ...],
    "required": true
  },
  ...
]
```

### Tabela: `template_chunks`

Chunks individuais com embeddings.

```sql
CREATE TABLE template_chunks (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES templates(id),
  section TEXT,                 -- Nome da seção (ex: "Dos Fatos")
  role TEXT,                   -- intro, fundamentacao, pedido, etc.
  content_markdown TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536),       -- Embedding do chunk
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Índices

```sql
-- Índices B-tree
CREATE INDEX idx_document_files_file_path ON document_files(file_path);
CREATE INDEX idx_document_files_status ON document_files(status);
CREATE INDEX idx_templates_schema_config_id ON templates(schema_config_id);
CREATE INDEX idx_template_chunks_template_id ON template_chunks(template_id);
CREATE INDEX idx_classification_configs_is_active ON classification_configs(is_active);
CREATE INDEX idx_template_schema_configs_is_active ON template_schema_configs(is_active);

-- Índices JSONB (GIN) para campos frequentemente filtrados
-- Nota: Podem ser adicionados conforme necessário para performance
-- CREATE INDEX idx_templates_metadata_doc_type ON templates USING GIN ((metadata->>'docType'));
-- CREATE INDEX idx_templates_metadata_area ON templates USING GIN ((metadata->>'area'));

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

### model_provider (Novo)

- `openai`: Provider OpenAI
- `google`: Provider Google/Gemini

### doc_type, area, complexity (Deprecados)

**Nota**: Estes enums foram removidos após migração. Os valores agora são armazenados como strings no `metadata` JSONB e definidos dinamicamente pelo schema configurável.

**Valores históricos** (agora em metadata):
- `docType`: peticao_inicial, contestacao, recurso, parecer, contrato, modelo_generico, outro
- `area`: civil, trabalhista, tributario, empresarial, consumidor, penal, administrativo, previdenciario, outro
- `complexity`: simples, medio, complexo

## Operações de Busca

### Busca por Similaridade Vetorial

```sql
-- Busca chunks similares a uma query (com campos JSONB)
SELECT
  tc.content_markdown,
  t.title,
  t.metadata->>'docType' as doc_type,
  t.metadata->>'area' as area,
  1 - (tc.embedding <=> $1::vector) as similarity
FROM template_chunks tc
JOIN templates t ON t.id = tc.template_id
WHERE t.metadata->>'area' = 'civil'  -- Filtro opcional em JSONB
ORDER BY tc.embedding <=> $1::vector
LIMIT 10;
```

**Nota**: Campos agora são acessados via operadores JSONB (`->` para objeto, `->>` para texto).

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

## Migração de Dados

### Migração para Schema Dinâmico (2025-01-22)

**Status**: ✅ Concluída

**Mudanças**:
- Colunas fixas (`doc_type`, `area`, `jurisdiction`, `complexity`, `tags`, `summary`, `quality_score`, `is_gold`, `is_silver`) migradas para `metadata` JSONB
- Enums removidos (`doc_type`, `area`, `complexity`)
- Schema padrão criado com campos atuais
- Todos os templates (2365) migrados com sucesso

**Ver**: [Guia de Migração](../implementation-progress/MIGRATION_GUIDE.md) para detalhes.

### Dados Antigos (Sistema Python)

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

-- Verificar templates com metadata válido
SELECT 
  COUNT(*) as total,
  COUNT(metadata) as with_metadata,
  COUNT(schema_config_id) as with_schema_id
FROM templates;

-- Verificar conteúdo do metadata
SELECT
  id,
  title,
  metadata->>'docType' as doc_type,
  metadata->>'area' as area,
  metadata->>'complexity' as complexity
FROM templates
LIMIT 10;

-- Verificar schema padrão
SELECT
  id,
  name,
  fields,
  is_active
FROM template_schema_configs
WHERE is_active = true;
```
