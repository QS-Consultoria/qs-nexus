# Arquitetura do Sistema RAG

## Visão Geral

O sistema RAG processa documentos jurídicos (DOCX, DOC, PDF) através de um pipeline completo que converte para Markdown, classifica com metadados estruturados e gera embeddings para busca vetorial.

## Fluxo de Dados

```
Documentos (DOCX, DOC, PDF) (../list-docx)
    ↓
[1] npm run rag:process
    ↓
Extração de Texto (pdf-parse/textract/mammoth)
    ↓
[Opcional] Estruturação com Gemini (se GOOGLE_GENERATIVE_AI_API_KEY configurada)
    ↓
Markdown + Tracking (document_files)
    ↓
[2] npm run rag:filter
    ↓
Documentos Filtrados (status: completed/rejected)
    ↓
[3] npm run rag:classify
    ↓
Templates (templates table)
    ↓
[4] npm run rag:chunk
    ↓
Chunks Preparados
    ↓
[5] npm run rag:embed
    ↓
Embeddings Gerados
    ↓
[6] npm run rag:store
    ↓
Neon PostgreSQL (template_chunks com embeddings)
```

## Componentes

### 1. File Tracker (`lib/services/file-tracker.ts`)

Sistema de tracking que evita reprocessamento:

- **Hash SHA256**: Detecta mudanças em arquivos
- **Status**: pending, processing, completed, failed, rejected
- **Caminhos Relativos**: Portável entre máquinas
- **Rejeição Permanente**: Arquivos rejeitados nunca são reprocessados

### 2. Document Converter (`lib/services/document-converter.ts`)

- **Conversão Unificada**: Suporta DOCX, DOC, PDF → Markdown
- **DOCX**: Usa `mammoth` (preserva estrutura completa)
- **DOC**: Usa `textract` (Node.js puro), com fallback para LibreOffice → DOCX → mammoth, ou Pandoc, com estruturação opcional via Google Gemini
- **PDF**: Usa `pdf-parse` (Node.js puro), com fallback para Pandoc, com estruturação opcional via Google Gemini (melhor preservação)
- **Preservação**: Mantém estrutura (títulos, listas, parágrafos) quando possível
- **Limpeza**: Normaliza formatação
- **Estruturação com Gemini**: Opcionalmente usa Google Gemini 2.0 Flash para estruturar texto extraído em markdown bem formatado (requer `GOOGLE_GENERATIVE_AI_API_KEY`)

### 2.1. Markdown Structurer (`lib/services/markdown-structurer.ts`)

Serviço opcional que usa Google Gemini para estruturar texto extraído:

- **Modelo**: Gemini 2.0 Flash (com fallback para Gemini 2.0 Flash Lite)
- **Limite de Tokens**: 875k tokens (dentro do limite de 1M do Gemini)
- **Contagem de Tokens**: Usa `tiktoken` para contagem precisa
- **Truncamento Inteligente**: Trunca textos grandes mantendo o máximo de conteúdo possível
- **Estruturação**: Adiciona títulos, parágrafos, listas e formatação markdown apropriada
- **Fallback**: Se não disponível, usa formatação básica

### 3. Classifier (`lib/services/classifier.ts`)

Sistema de classificação configurável e refatorado:

- **Modelos Configuráveis**: Suporte a múltiplos providers (OpenAI, Google/Gemini) via configurações
- **Schema Dinâmico**: Gera schema Zod dinamicamente baseado em configuração de template
- **Estimativa de Tokens**: Usa `tiktoken` para estimativa precisa de tokens (com fallback)
- **Extração de Conteúdo**: Função padrão ou customizada (JavaScript) para extrair partes relevantes
- **Truncamento Inteligente**: Baseado em limites de tokens do modelo com margem para output
- **Validação de Respostas**: Detecta e para processamento se IA retornar dados vazios
- **Logging de Progresso**: Callbacks para acompanhar início/fim de cada classificação
- **Tratamento de Erros**: Retry automático para rate limits e fallback para documentos grandes

**Componentes Relacionados**:
- `lib/services/classification-config.ts`: CRUD de configurações de classificação
- `lib/services/content-extraction.ts`: Funções de extração de conteúdo
- `lib/services/content-truncation.ts`: Lógica de truncamento inteligente
- `lib/services/schema-builder.ts`: Geração de schema Zod dinâmico
- `lib/services/template-schema-service.ts`: CRUD de schemas de template

Ver [Guia de Classificação](../guides/classificacao.md) e [Guia de Classificação Configurável](../guides/classificacao-configuravel.md) para detalhes completos.

### 4. Chunker (`lib/services/chunker.ts`)

- **Estratégia Primária**: Chunking por seções Markdown (H1, H2)
- **Fallback**: Chunking por parágrafos respeitando tokens
- **Contexto**: Preserva título da seção com conteúdo
- **Role Inference**: Identifica papel da seção (fatos, fundamentacao, pedido, etc.)

### 5. Embedding Generator (`lib/services/embedding-generator.ts`)

- **Modelo**: text-embedding-3-small (1536 dimensões)
- **Batch Processing**: 64 chunks por requisição
- **Rate Limiting**: Tratamento automático de rate limits
- **Custo**: $0.02 por 1M tokens

### 6. Store Embeddings (`lib/services/store-embeddings.ts`)

- **Armazenamento**: Templates e chunks no Neon
- **Batch Insert**: 500 registros por batch
- **Transações**: Garantia de consistência
- **Schema Dinâmico**: Busca schema config ativo automaticamente e armazena campos no metadata JSONB

### 7. ConcurrencyPool (`lib/utils/concurrency-pool.ts`)

Sistema de pool de concorrência para processamento paralelo:

- **Controle de Concorrência**: Limita número de tarefas simultâneas
- **Retry Logic**: Retry automático com backoff exponencial
- **Progress Tracking**: Callbacks para acompanhar progresso
- **Error Handling**: Tratamento robusto de erros

Ver [Documentação do ConcurrencyPool](../reference/concurrency-pool.md) para detalhes.

### 8. Worker Threads (`lib/workers/docx-converter-worker.ts`)

Processamento isolado de conversão DOCX → Markdown:

- **Isolamento**: Processamento em thread separada
- **Paralelização**: Múltiplos workers simultâneos
- **Error Isolation**: Erros não afetam outros workers
- **Performance**: Aproveita múltiplos cores da CPU

Ver [Documentação de Worker Threads](../reference/worker-threads.md) para detalhes.

### 9. Sistema de Classificação Configurável

Sistema completo para configurar classificação e schema de templates:

#### 9.1. Configuração de Classificação (`lib/services/classification-config.ts`)

- **CRUD Completo**: Criar, ler, atualizar e deletar configurações
- **Múltiplos Providers**: OpenAI e Google/Gemini
- **Limites de Tokens**: Configuráveis por modelo
- **Função de Extração**: Padrão ou customizada (JavaScript)
- **Configuração Ativa**: Apenas uma configuração ativa por vez
- **Validação**: Valida limites de tokens e código JavaScript customizado

#### 9.2. Schema Dinâmico de Templates (`lib/services/template-schema-service.ts`)

- **CRUD Completo**: Criar, ler, atualizar e deletar schemas
- **Tipos Zod Completos**: Suporte a string, number, boolean, date, bigint, enum, literal, array, object, union
- **Campos Aninhados**: Suporte a objetos e arrays de objetos recursivos
- **Validação**: Valida definições de campos antes de salvar
- **Schema Ativo**: Apenas um schema ativo por vez
- **Geração Dinâmica**: Gera schema Zod em tempo de execução

#### 9.3. Geração de Schema Zod (`lib/services/schema-builder.ts`)

- **Construção Dinâmica**: Gera schema Zod baseado em definições de campos
- **Tipos Complexos**: Suporte completo a arrays, objetos, unions
- **Validação Recursiva**: Valida campos aninhados recursivamente
- **Documentação**: Suporte a `.describe()` para documentação de campos

#### 9.4. Estimativa de Tokens (`lib/utils/token-estimation.ts`)

- **tiktoken**: Estimativa precisa para modelos OpenAI
- **Fallback**: Aproximação para modelos Google
- **Suporte Multi-Modelo**: Diferentes encodings por modelo

#### 9.5. Extração de Conteúdo (`lib/services/content-extraction.ts`)

- **Função Padrão**: Extrai início, estrutura e fim do documento
- **Função Customizada**: Executa código JavaScript do banco (com validação de segurança)
- **Validação de Segurança**: Bloqueia require, import, eval, etc.

#### 9.6. Truncamento Inteligente (`lib/services/content-truncation.ts`)

- **Cálculo de Tokens Disponíveis**: Considera system prompt, user prompt e margem para output
- **Decisão Automática**: Escolhe entre extração e truncamento direto
- **Preservação**: Mantém início e fim do documento ao truncar

## Estrutura de Dados

### TemplateDocument (Legado)

```typescript
{
  id?: string;
  title: string;
  docType: 'peticao_inicial' | 'contestacao' | 'recurso' | ...;
  area: 'civil' | 'trabalhista' | 'tributario' | ...;
  jurisdiction: string; // 'BR', 'TRT1', 'TJSP', etc.
  complexity: 'simples' | 'medio' | 'complexo';
  tags: string[];
  summary: string; // Resumo otimizado para embedding
  markdown: string; // Conteúdo completo em Markdown
  metadata?: Record<string, any>;
  qualityScore?: number; // 0-100
  isGold: boolean;
  isSilver: boolean;
}
```

### DynamicTemplateDocument (Novo)

Templates agora suportam campos dinâmicos definidos por schema configurável:

```typescript
{
  id?: string;
  title: string;
  markdown: string;
  metadata: Record<string, any>; // Campos dinâmicos definidos pelo schema
  schemaConfigId: string; // Referência ao schema usado
}
```

Os campos em `metadata` são definidos dinamicamente pelo `TemplateSchemaConfig` ativo.

### Banco de Dados

#### Tabela: `document_files`

- Tracking de arquivos processados
- Caminho relativo, hash, status, palavras

#### Tabela: `templates` (Refatorada)

- Documentos processados completos
- **Campos Essenciais**: id, document_file_id, title, markdown
- **Metadata JSONB**: Todos os campos configuráveis armazenados aqui
- **Schema Config**: Referência ao schema ativo (`schema_config_id`)
- **Migração**: Dados antigos migrados para metadata JSONB

#### Tabela: `classification_configs` (Nova)

- Configurações de classificação
- System prompt, modelo, limites de tokens
- Função de extração customizada (opcional)
- Flag de configuração ativa

#### Tabela: `template_schema_configs` (Nova)

- Schemas de template configuráveis
- Definições de campos (JSONB)
- Flag de schema ativo

#### Tabela: `template_chunks`

- Chunks individuais com embeddings
- Seção, role, conteúdo Markdown
- Embedding vector(1536) com índice HNSW

## Decisões de Design

### Por que Markdown?

- Preserva estrutura do documento
- Formato canônico para o agente de IA
- Facilita chunking por seções

### Por que Caminhos Relativos?

- Portabilidade entre máquinas
- Não depende de caminhos absolutos
- Facilita colaboração

### Por que Tracking no Banco?

- Evita reprocessamento
- Permite auditoria
- Suporta retomada após falhas

### Por que HNSW?

- Melhor qualidade de busca que IVFFlat
- Performance otimizada para busca vetorial
- Configuração balanceada (m=16, ef_construction=64)

### Por que text-embedding-3-small?

- Custo-benefício excelente ($0.02/1M tokens)
- 1536 dimensões (suficiente para RAG)
- Performance adequada para português

## Paralelização

O sistema foi completamente paralelizado para melhorar a performance:

- ✅ **ConcurrencyPool**: Sistema de pool de concorrência para processamento paralelo
- ✅ **Worker Threads**: Processamento isolado de conversão DOCX → Markdown
- ✅ **Scripts Paralelizados**: Todos os scripts principais agora são paralelos
  - `process-documents`: 6 workers paralelos (Worker Threads)
  - `classify-documents`: 3 workers paralelos
  - `generate-embeddings`: 2 workers paralelos
  - `filter-documents`: 10 workers paralelos

Ver [Guia de Paralelização](../guides/paralelizacao.md) para detalhes.

## Funcionalidades do Dashboard

### Chat RAG com Múltiplos Modelos

O sistema de chat suporta múltiplos modelos de IA:

- **OpenAI**: GPT-4o, GPT-4o Mini
- **Google Gemini**: 2.0 Flash, 2.0 Flash Lite, 2.5 Flash, 2.5 Flash Lite
- **Seleção Dinâmica**: Usuário pode escolher o modelo na interface
- **Fallback Automático**: Se o modelo selecionado falhar, usa GPT-4o Mini

Ver [Guia do Dashboard](../guides/dashboard.md) para detalhes.

### Reprocessamento e Regeneração

O dashboard permite:

- **Reprocessamento Completo**: Upload de novo arquivo e reprocessamento completo do documento
- **Regeneração de Chunks**: Regenerar chunks e embeddings sem reprocessar o documento completo
- **Edição de Markdown**: Editar markdown diretamente na interface
- **Preview de Markdown**: Visualizar markdown renderizado

### Sistema de Configuração

O dashboard inclui uma página completa de configurações:

- **Página Principal**: `/settings` com submenu de navegação
- **Configuração de Classificação**: `/settings/classification`
  - CRUD de configurações de classificação
  - Editor de system prompt
  - Seletor de modelo com limites de tokens
  - Editor de função de extração customizada
- **Schema de Template**: `/settings/template-schema`
  - Editor visual de campos
  - Suporte a todos os tipos Zod
  - Preview em tempo real do schema gerado
  - Campos aninhados e arrays

Ver [Guia de Classificação Configurável](../guides/classificacao-configuravel.md) e [Guia de Schema Dinâmico](../guides/schema-dinamico.md) para detalhes.

### Melhorias Futuras

- Chunking mais inteligente baseado em contexto jurídico
- Cache de embeddings para reprocessamento
- Auto-ajuste de concorrência baseado em rate limits
- Dashboard de monitoramento em tempo real
- Cache de resultados de estruturação com Gemini
- Histórico de edições de markdown
- Índices GIN para campos JSONB frequentemente filtrados
