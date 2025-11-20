# Arquitetura do Sistema RAG

## Visão Geral

O sistema RAG processa documentos jurídicos DOCX através de um pipeline completo que converte para Markdown, classifica com metadados estruturados e gera embeddings para busca vetorial.

## Fluxo de Dados

```
DOCX Files (../list-docx)
    ↓
[1] npm run rag:process
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

### 2. DOCX Converter (`lib/services/docx-converter.ts`)

- **Conversão**: DOCX → Markdown usando `mammoth`
- **Preservação**: Mantém estrutura (títulos, listas, parágrafos)
- **Limpeza**: Normaliza formatação

### 3. Classifier (`lib/services/classifier.ts`)

- **Modelo**: GPT-5 via AI SDK
- **Output**: TemplateDocument completo
- **Metadados**: docType, area, jurisdiction, complexity, tags, summary, qualityScore
- **Classificação Automática**: GOLD (>60) e SILVER (56-60)
- **Truncamento Inteligente**: Trunca documentos grandes mantendo início e fim
- **Validação de Respostas**: Detecta e para processamento se IA retornar dados vazios
- **Logging de Progresso**: Callbacks para acompanhar início/fim de cada classificação
- **Tratamento de Erros**: Retry automático para rate limits e fallback para documentos grandes

Ver [Guia de Classificação](../guides/classificacao.md) para detalhes completos sobre decisões de design e limitações.

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

## Estrutura de Dados

### TemplateDocument

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

### Banco de Dados

#### Tabela: `document_files`

- Tracking de arquivos processados
- Caminho relativo, hash, status, palavras

#### Tabela: `templates`

- Documentos processados completos
- TemplateDocument com todos os metadados
- Relacionamento com `document_files`

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

## Melhorias Futuras

- Chunking mais inteligente baseado em contexto jurídico
- Cache de embeddings para reprocessamento
- Auto-ajuste de concorrência baseado em rate limits
- Dashboard de monitoramento em tempo real
