# Guia de Migração - Fase 1: Banco de Dados e Schema

Este guia explica como executar a migração para o novo schema dinâmico de templates.

## Pré-requisitos

- Banco de dados PostgreSQL com pgvector habilitado
- Variável `DATABASE_URL` configurada no `.env.local`
- Backup do banco de dados (recomendado)

## Processo de Migração

A migração deve ser executada em **3 etapas sequenciais**:

### Etapa 1: Executar Migration do Drizzle

Esta migration cria as novas tabelas e adiciona a coluna `schema_config_id`:

```bash
npm run db:migrate
```

**O que esta migration faz:**

- Cria a tabela `classification_configs`
- Cria a tabela `template_schema_configs`
- Cria o enum `model_provider`
- Adiciona a coluna `schema_config_id` na tabela `templates`
- Torna as colunas antigas nullable (para permitir migração de dados)

### Etapa 2: Migrar Dados Existentes

Este script migra os dados das colunas fixas para o JSONB `metadata`:

```bash
npm run db:migrate-template-schema
```

**O que este script faz:**

1. Cria o schema padrão inicial com os campos atuais (docType, area, jurisdiction, etc.)
2. Migra dados existentes das colunas fixas para `metadata` JSONB
3. Associa todos os templates ao schema padrão criado
4. Valida que todos os templates foram migrados corretamente

### Etapa 3: Remover Colunas Antigas

Após validar que todos os dados foram migrados, remova as colunas antigas:

```bash
npm run db:remove-old-columns
```

**O que este script faz:**

1. Valida que todos os templates têm `metadata` e `schema_config_id`
2. Remove índices das colunas antigas
3. Remove as colunas antigas (doc_type, area, jurisdiction, complexity, tags, summary, quality_score, is_gold, is_silver)
4. Remove os enums não utilizados (doc_type, area, complexity)

## Validação

Após cada etapa, você pode validar o progresso:

### Verificar estrutura das tabelas

```sql
-- Verificar novas tabelas
SELECT * FROM classification_configs;
SELECT * FROM template_schema_configs;

-- Verificar templates
SELECT id, title, metadata, schema_config_id FROM templates LIMIT 5;
```

### Verificar dados migrados

```sql
-- Contar templates com metadata
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
  metadata->>'jurisdiction' as jurisdiction
FROM templates
LIMIT 10;
```

### Verificar schema padrão

```sql
SELECT
  id,
  name,
  fields,
  is_active
FROM template_schema_configs
WHERE name = 'Schema Padrão';
```

## Rollback (se necessário)

Se precisar reverter a migração:

1. **Restaurar backup do banco de dados** (método mais seguro)
2. Ou executar manualmente:

```sql
-- Restaurar colunas antigas (se necessário)
ALTER TABLE templates
  ADD COLUMN doc_type doc_type,
  ADD COLUMN area area,
  ADD COLUMN jurisdiction text DEFAULT 'BR',
  ADD COLUMN complexity complexity,
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN summary text,
  ADD COLUMN quality_score numeric(5,2),
  ADD COLUMN is_gold boolean DEFAULT false,
  ADD COLUMN is_silver boolean DEFAULT false;

-- Migrar dados de volta (exemplo)
UPDATE templates
SET
  doc_type = (metadata->>'docType')::doc_type,
  area = (metadata->>'area')::area,
  jurisdiction = metadata->>'jurisdiction',
  complexity = (metadata->>'complexity')::complexity,
  tags = ARRAY(SELECT jsonb_array_elements_text(metadata->'tags')),
  summary = metadata->>'summary',
  quality_score = (metadata->>'qualityScore')::numeric,
  is_gold = (metadata->>'isGold')::boolean,
  is_silver = (metadata->>'isSilver')::boolean;
```

## Troubleshooting

### Erro: "metadata is null"

- Verifique se o script de migração de dados foi executado
- Execute novamente: `npm run db:migrate-template-schema`

### Erro: "schema_config_id is null"

- Verifique se o schema padrão foi criado
- Execute novamente: `npm run db:migrate-template-schema`

### Erro ao remover colunas

- Verifique se todos os templates têm `metadata` e `schema_config_id`
- Execute a validação manual antes de remover colunas

## Próximos Passos

Após completar a migração:

1. Atualizar o schema do Drizzle para remover as colunas antigas
2. Gerar nova migration (será vazia, mas manterá o schema sincronizado)
3. Validar com MCP Neon
4. Continuar com a Fase 2 do plano
