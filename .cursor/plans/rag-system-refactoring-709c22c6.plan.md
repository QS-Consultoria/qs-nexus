<!-- 709c22c6-abc1-4f2b-bc0b-a005bd496e82 abbe39c6-5350-4c5f-8d33-8d7d8043c686 -->
# Plano de Refatoração do Sistema RAG

## Objetivo

Transformar o sistema atual em uma solução robusta que processa documentos jurídicos DOCX, converte para Markdown, classifica com metadados estruturados (TemplateDocument), gera embeddings otimizados e armazena no Neon com controle de processamento.

## 1. Estrutura de Banco de Dados (Neon + Drizzle + pgvector)

### 1.1. Configuração Inicial

- Usar MCP Neon para configurar extensão pgvector no banco
- Criar migrations Drizzle para as tabelas necessárias
- Habilitar extensão: `CREATE EXTENSION IF NOT EXISTS vector;`

### 1.2. Schema Drizzle (lib/db/schema/rag.ts)

**Tabela: `document_files`** - Tracking de arquivos DOCX processados

```typescript
- id: uuid PK
- file_path: text UNIQUE (caminho relativo ao root do projeto, ex: "list-docx/01. Trabalhista/documento.docx")
- file_name: text
- file_hash: text (SHA256 para detectar mudanças)
- status: enum ('pending', 'processing', 'completed', 'failed', 'rejected')
- rejected_reason: text nullable (para documentos ruins)
- words_count: integer
- processed_at: timestamp nullable
- created_at: timestamp
- updated_at: timestamp
```

**Importante:** `file_path` deve ser sempre relativo ao root do projeto para garantir portabilidade entre diferentes máquinas e desenvolvedores.

**Tabela: `templates`** - Documentos processados (TemplateDocument)

```typescript
- id: uuid PK
- document_file_id: uuid FK -> document_files.id
- title: text
- doc_type: text (peticao_inicial, contestacao, recurso, etc.)
- area: text (civil, trabalhista, tributario, etc.)
- jurisdiction: text (BR, TRT1, TJSP, etc.)
- complexity: enum ('simples', 'medio', 'complexo')
- tags: text[] (array de tags)
- summary: text (resumo curto para embedding)
- markdown: text (conteúdo completo em Markdown)
- metadata: jsonb (metadados adicionais flexíveis)
- quality_score: decimal (nota calculada)
- is_gold: boolean
- is_silver: boolean
- created_at: timestamp
- updated_at: timestamp
```

**Tabela: `template_chunks`** - Chunks para RAG

```typescript
- id: uuid PK
- template_id: uuid FK -> templates.id
- section: text (Dos Fatos, Do Direito, Dos Pedidos, etc.)
- role: text (intro, fundamentacao, pedido, etc.)
- content_markdown: text (trecho em Markdown)
- chunk_index: integer (ordem no documento)
- embedding: vector(1536) (pgvector)
- created_at: timestamp
```

**Índices:**

- `document_files.file_path` (UNIQUE)
- `document_files.file_hash`
- `document_files.status`
- `templates.doc_type`, `templates.area`
- `template_chunks.template_id`
- **`template_chunks.embedding` (HNSW index para busca vetorial otimizada)**
  - Tipo: HNSW (Hierarchical Navigable Small World) - preferível sobre IVFFlat
  - Operador: `vector_cosine_ops` (para cosine similarity)
  - Configuração: `m=16, ef_construction=64` (valores padrão otimizados)
  - SQL: `CREATE INDEX idx_template_chunks_embedding_hnsw ON template_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`

### 1.3. Migrations

- Migration inicial: criar extensão pgvector
- Migration 1: criar tabelas `document_files`, `templates`, `template_chunks`
- Migration 2: criar índices e constraints
  - Índices B-tree para campos de busca comum
  - **Índice HNSW na coluna `embedding`** de `template_chunks`:
    ```sql
    CREATE INDEX idx_template_chunks_embedding_hnsw 
    ON template_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
    ```

  - HNSW é preferível sobre IVFFlat para melhor qualidade de busca
  - Configuração otimizada para balance entre performance e qualidade

## 2. Sistema de Tracking de Processamento

### 2.1. Serviço de Tracking (lib/services/file-tracker.ts)

- `checkFileProcessed(filePath, fileHash)`: verifica se arquivo já foi processado
- `markFileProcessing(filePath, fileHash)`: marca como em processamento
- `markFileCompleted(filePath, templateId)`: marca como completo
- `markFileRejected(filePath, reason)`: marca documento ruim (nunca reprocessa)
- `getPendingFiles()`: lista arquivos pendentes
- `getRejectedFiles()`: lista documentos rejeitados (para auditoria)
- `getProcessingStatus()`: retorna estatísticas gerais do processamento
- `resetFileStatus(filePath)`: reseta status de um arquivo para permitir reprocessamento (exceto rejeitados)
- `getFileByPath(filePath)`: busca informações de um arquivo específico

### 2.2. Hash de Arquivo

- Calcular SHA256 do conteúdo do arquivo DOCX
- Usar hash para detectar mudanças (se arquivo mudou, pode reprocessar)
- Arquivos rejeitados: sempre ignorar, mesmo com hash diferente

## 3. Pipeline de Processamento

### 3.1. Etapa 1: Extração e Conversão DOCX → Markdown

**Script: `scripts/process-documents.ts`**

- Ler arquivos DOCX de `/Users/william/development/legalwise/rag-system/list-docx`
- Para cada arquivo:
  - Verificar tracking (já processado? rejeitado?)
  - Calcular hash
  - Converter DOCX → Markdown usando `mammoth` ou `pandoc`
  - Preservar estrutura (títulos, listas, parágrafos)
  - Extrair metadados básicos (tamanho, palavras)
- Salvar Markdown intermediário (opcional, para debug)

### 3.2. Etapa 2: Filtragem e Validação

**Script: `scripts/filter-documents.ts`**

- Filtrar por tamanho (300-25.000 palavras)
- Detectar documentos corrompidos/vazios
- Marcar como `rejected` no tracking se:
  - Muito pequeno (< 300 palavras)
  - Muito grande (> 25.000 palavras)
  - Corrompido ou vazio
  - Sem conteúdo útil

### 3.3. Etapa 3: Classificação com TemplateDocument

**Script: `scripts/classify-documents.ts`**

Usar AI SDK com OpenAI para classificar cada documento e gerar TemplateDocument completo:

**Prompt de classificação melhorado:**

- Extrair: `doc_type`, `area`, `jurisdiction`, `complexity`, `tags`, `summary`
- Classificar qualidade: `quality_score` (0-100)
- Identificar seções principais do documento
- Gerar resumo otimizado para embedding

**Output:** TemplateDocument completo com todos os metadados

### 3.4. Etapa 4: Chunking Inteligente

**Script: `scripts/chunk-documents.ts`**

- Chunking por seções Markdown (H1, H2) quando possível
- Fallback: janelas de 300-800 tokens respeitando parágrafos
- Preservar contexto (manter título da seção com conteúdo)
- Armazenar `section` e `role` para cada chunk

### 3.5. Etapa 5: Geração de Embeddings

**Script: `scripts/generate-embeddings.ts`**

**Modelo de Embedding: `text-embedding-3-small`**

- Dimensões: 1536
- Custo: $0.02 por 1M tokens
- Performance: Excelente para RAG em português
- Alternativa considerada: `text-embedding-3-large` (3072 dim, $0.13/1M) - mais caro, ganho marginal

**Processo:**

- Usar AI SDK `embedMany` para batch processing
- Batch size: 64 chunks
- Gerar embedding para cada chunk
- Armazenar em `template_chunks.embedding`

### 3.6. Etapa 6: Armazenamento no Banco

**Script: `scripts/store-embeddings.ts`**

- Inserir em batches (500 registros)
- Usar transações para consistência
- Atualizar tracking após sucesso
- **Importante:** Criar índice HNSW após inserção inicial dos dados (ou antes, se possível)

## 4. Estrutura de Arquivos

### 4.1. Organização

```
lw-rag-system/
├── lib/
│   ├── db/
│   │   ├── schema/
│   │   │   └── rag.ts (schema Drizzle)
│   │   ├── migrations/ (migrations Drizzle)
│   │   └── index.ts
│   ├── services/
│   │   ├── file-tracker.ts
│   │   ├── docx-converter.ts
│   │   ├── classifier.ts
│   │   ├── chunker.ts
│   │   └── embedding-generator.ts
│   └── types/
│       └── template-document.ts (TemplateDocument type)
├── scripts/
│   ├── process-documents.ts
│   ├── filter-documents.ts
│   ├── classify-documents.ts
│   ├── chunk-documents.ts
│   ├── generate-embeddings.ts
│   └── store-embeddings.ts
├── .env.local (configurações)
└── .gitignore (atualizado)
```

### 4.2. Gitignore

- Adicionar: `*.jsonl`, `*.csv` (dados processados)
- Adicionar: `data/` (pasta de dados intermediários)
- Manter apenas código no Git

## 5. Implementação de Serviços

### 5.1. Conversor DOCX → Markdown (lib/services/docx-converter.ts)

- Usar `mammoth` (Node.js) ou `pandoc` (via CLI)
- Preservar estrutura Markdown
- Limpar formatação desnecessária
- Extrair metadados do documento

### 5.2. Classificador (lib/services/classifier.ts)

- Integração com AI SDK
- Prompt estruturado para extrair TemplateDocument
- Validação de campos obrigatórios
- Retry logic para erros de API

### 5.3. Chunker (lib/services/chunker.ts)

- Análise de estrutura Markdown
- Chunking por seções (preferencial)
- Chunking por tokens (fallback)
- Preservar contexto entre chunks

### 5.4. Gerador de Embeddings (lib/services/embedding-generator.ts)

- Usar AI SDK `embedMany`
- Batch processing otimizado
- Tratamento de rate limits
- Retry logic

## 6. Configuração e Variáveis de Ambiente

### 6.1. .env.local

```env
# Database
DATABASE_URL=postgresql://... (Neon connection string)

# OpenAI
OPENAI_API_KEY=sk-...

# Configurações
DOCX_SOURCE_DIR=/Users/william/development/legalwise/rag-system/list-docx
EMBEDDING_MODEL=text-embedding-3-small
BATCH_SIZE=64
CHUNK_MAX_TOKENS=800
```

## 7. Scripts de Execução

### 7.1. Pipeline Completo

```bash
npm run rag:process    # Extrai e converte DOCX → Markdown
npm run rag:filter     # Filtra documentos
npm run rag:classify   # Classifica com TemplateDocument
npm run rag:chunk      # Gera chunks
npm run rag:embed      # Gera embeddings
npm run rag:store      # Armazena no banco
```

### 7.2. Pipeline Incremental

- Verificar tracking antes de cada etapa
- Processar apenas arquivos pendentes
- Suportar retomada após falhas

## 8. Melhorias de Classificação

### 8.1. Metadados TemplateDocument

- `doc_type`: peticao_inicial, contestacao, recurso, parecer, contrato, modelo_generico, outro
- `area`: civil, trabalhista, tributario, empresarial, consumidor, penal, administrativo, previdenciario, outro
- `jurisdiction`: BR, TRT1, TJSP, etc.
- `complexity`: simples, medio, complexo
- `tags`: array de tags relevantes
- `summary`: resumo otimizado para embedding (2-3 linhas)
- `quality_score`: 0-100 (baseado em clareza, estrutura, risco)

### 8.2. Prompt de Classificação

- Incluir exemplos few-shot
- Extrair estrutura do documento (seções)
- Identificar tipo de peça jurídica
- Avaliar qualidade e risco

## 9. Otimizações

### 9.1. Processamento Paralelo

- Processar múltiplos arquivos em paralelo (com limite)
- Batch processing para embeddings
- Transações otimizadas para inserção

### 9.2. Cache e Retomada

- Cache de embeddings já gerados
- Retomada de processamento interrompido
- Logs detalhados para debugging

## 10. Validação e Testes

### 10.1. Validação de Dados

- Validar TemplateDocument antes de salvar
- Verificar integridade de chunks
- Validar embeddings (dimensões corretas)

### 10.2. Testes

- Testes unitários para serviços
- Testes de integração para pipeline
- Validação de conversão DOCX → Markdown

## Próximos Passos Imediatos

1. Configurar Neon e habilitar pgvector (via MCP)
2. Criar schema Drizzle com migrations (incluindo índice HNSW)
3. Implementar file-tracker service
4. Implementar conversor DOCX → Markdown
5. Refatorar classificador para TemplateDocument
6. Implementar chunking inteligente
7. Migrar geração de embeddings para AI SDK
8. Implementar armazenamento no banco
9. Criar scripts de pipeline
10. Atualizar .gitignore

### To-dos

- [ ] Configurar Neon: habilitar extensão pgvector usando MCP Neon, verificar conexão com DATABASE_URL do .env.local
- [ ] Criar schema Drizzle (lib/db/schema/rag.ts) com tabelas: document_files, templates, template_chunks
- [ ] Gerar migrations Drizzle para criar tabelas, índices e constraints no banco Neon
- [ ] Implementar serviço de tracking (lib/services/file-tracker.ts) para controlar processamento e evitar duplicatas
- [ ] Implementar conversor DOCX → Markdown (lib/services/docx-converter.ts) usando mammoth ou pandoc
- [ ] Criar tipo TypeScript TemplateDocument (lib/types/template-document.ts) conforme especificação do ChatGPT
- [ ] Refatorar classificador (lib/services/classifier.ts) para gerar TemplateDocument completo com metadados melhorados
- [ ] Implementar chunker inteligente (lib/services/chunker.ts) que respeita seções Markdown e fallback para tokens
- [ ] Migrar geração de embeddings para AI SDK (lib/services/embedding-generator.ts) usando text-embedding-3-small
- [ ] Implementar armazenamento no banco (lib/services/store-embeddings.ts) com batch processing e transações
- [ ] Criar script process-documents.ts: extração DOCX, conversão Markdown, tracking
- [ ] Criar script filter-documents.ts: validação, filtragem, marcação de rejeitados
- [ ] Criar script classify-documents.ts: classificação com TemplateDocument, armazenamento de templates
- [ ] Criar script chunk-documents.ts: chunking inteligente, preparação para embeddings
- [ ] Criar script generate-embeddings.ts: geração de embeddings em batch usando AI SDK
- [ ] Criar script store-embeddings.ts: inserção no banco com pgvector, atualização de tracking
- [ ] Atualizar .gitignore para excluir arquivos de dados (*.jsonl, *.csv, data/) mantendo apenas código
- [ ] Adicionar scripts npm (rag:process, rag:filter, etc.) no package.json para executar pipeline
- [ ] Documentar variáveis de ambiente necessárias no .env.local (DATABASE_URL, OPENAI_API_KEY, etc.)