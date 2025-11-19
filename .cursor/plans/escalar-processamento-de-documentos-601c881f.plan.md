<!-- 601c881f-41db-49ad-b022-cbe52a685142 1dc084d6-f2cb-4bc1-809a-e4b5ff442f00 -->
# Paralelizar Scripts do Pipeline RAG

## Análise dos Scripts

### 1. filter-documents.ts ✅ PARALELIZAR

**Status atual**: Sequencial

**Operação**: Verifica wordCount e marca como rejeitado se fora do range

**Tipo**: I/O bound (banco de dados)

**Benefício**: Médio - operação simples mas pode acelerar com muitos arquivos

**Sequencial?**: Não

**Prioridade**: Média

### 2. classify-documents.ts ✅ PARALELIZAR (ALTA PRIORIDADE)

**Status atual**: Sequencial

**Operação**: Chama API OpenAI (gpt-5) para classificar documentos

**Tipo**: I/O bound (API externa, operação lenta)

**Benefício**: ALTO - operação mais lenta do pipeline, paralelização acelera significativamente

**Sequencial?**: Não

**Rate Limits**: Sim - precisa de controle (já tem retry logic básico)

**Prioridade**: ALTA

### 3. chunk-documents.ts ⚠️ OPCIONAL

**Status atual**: Sequencial

**Operação**: Apenas análise/visualização (não salva)

**Tipo**: CPU bound local

**Benefício**: Baixo - script de análise, não crítico

**Sequencial?**: Não

**Prioridade**: Baixa (pode deixar como está)

### 4. generate-embeddings.ts ✅ PARALELIZAR (ALTA PRIORIDADE)

**Status atual**: Sequencial (mas já usa batch processing)

**Operação**: Chama API OpenAI para gerar embeddings em batches de 64

**Tipo**: I/O bound (API externa)

**Benefício**: ALTO - operação lenta, paralelização acelera muito

**Sequencial?**: Não

**Rate Limits**: Sim - já tem retry logic, precisa de controle de concorrência

**Prioridade**: ALTA

### 5. store-embeddings.ts ❌ NÃO PRECISA

**Status atual**: Apenas verificação/relatório

**Operação**: Não processa nada, só verifica

**Tipo**: N/A

**Benefício**: Nenhum

**Prioridade**: Nenhuma

## Implementação

### Fase 1: Scripts de Alta Prioridade

#### classify-documents.ts

- Usar ConcurrencyPool com limite de concorrência (padrão: 3-5 para evitar rate limits)
- Manter retry logic existente
- Adicionar progress tracking
- Considerar rate limiting mais robusto

#### generate-embeddings.ts

- Usar ConcurrencyPool com limite de concorrência (padrão: 2-3 para respeitar rate limits)
- Manter batch processing interno (64 chunks por batch)
- Paralelizar processamento de templates, não chunks individuais
- Adicionar progress tracking

### Fase 2: Scripts de Média Prioridade

#### filter-documents.ts

- Usar ConcurrencyPool simples
- Limite de concorrência alto (10-20) - operação rápida
- Adicionar progress tracking

### Fase 3: Scripts Opcionais

#### chunk-documents.ts

- Opcional: pode deixar sequencial (script de análise)
- Se implementar: usar ConcurrencyPool com limite médio (5-10)

## Considerações de Rate Limiting

### OpenAI API Limits

- **GPT-5 (classify)**: Rate limits mais restritivos, precisa de controle cuidadoso
- **Embeddings**: Rate limits mais generosos, mas ainda precisa controle
- **Solução**: Limitar concorrência nos scripts que chamam API (3-5 para classify, 2-3 para embeddings)

### Estratégia

1. Usar ConcurrencyPool com limites conservadores
2. Manter retry logic existente nos serviços
3. Adicionar delays entre requisições se necessário
4. Monitorar erros de rate limit e ajustar concorrência

## Variáveis de Ambiente

Adicionar ao `.env.local`:

```env
# Concorrência por script
CLASSIFY_CONCURRENCY=3      # Para classify-documents (padrão: 3)
EMBED_CONCURRENCY=2         # Para generate-embeddings (padrão: 2)
FILTER_CONCURRENCY=10       # Para filter-documents (padrão: 10)
```

## Ordem de Implementação

1. **classify-documents.ts** (maior impacto)
2. **generate-embeddings.ts** (segundo maior impacto)
3. **filter-documents.ts** (ganho menor mas fácil de implementar)
4. **chunk-documents.ts** (opcional)

## Arquivos a Modificar

- `scripts/classify-documents.ts` - Refatorar para usar ConcurrencyPool
- `scripts/generate-embeddings.ts` - Refatorar para usar ConcurrencyPool
- `scripts/filter-documents.ts` - Refatorar para usar ConcurrencyPool
- `scripts/chunk-documents.ts` - Opcional
- `docs/SETUP.md` - Documentar novas variáveis de ambiente