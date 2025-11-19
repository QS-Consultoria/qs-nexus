# Guia de Paralelização

## Visão Geral

O sistema RAG foi paralelizado para melhorar significativamente a performance do processamento. Todos os scripts principais agora utilizam `ConcurrencyPool` para processar múltiplas tarefas simultaneamente.

## Scripts Paralelizados

### ✅ process-documents.ts

**Status**: Paralelizado com Worker Threads

- **Concorrência**: `WORKER_CONCURRENCY` (padrão: 6)
- **Tipo**: CPU-bound (conversão DOCX → Markdown)
- **Implementação**: Worker Threads + ConcurrencyPool
- **Ganho de Performance**: ~6x mais rápido

**Como funciona**:
1. Encontra todos os arquivos DOCX
2. Cria um pool com limite de concorrência
3. Cada tarefa cria um Worker Thread para conversão
4. Processa múltiplos arquivos simultaneamente

### ✅ classify-documents.ts

**Status**: Paralelizado

- **Concorrência**: `CLASSIFY_CONCURRENCY` (padrão: 3)
- **Tipo**: I/O-bound (API OpenAI GPT-5)
- **Implementação**: ConcurrencyPool
- **Ganho de Performance**: ~3x mais rápido
- **Rate Limiting**: Limite conservador para evitar rate limits

**Como funciona**:
1. Busca arquivos em status `processing`
2. Cria pool com limite de 3 workers (conservador para API)
3. Cada tarefa classifica um documento via OpenAI
4. Processa múltiplos documentos simultaneamente

### ✅ generate-embeddings.ts

**Status**: Paralelizado

- **Concorrência**: `EMBED_CONCURRENCY` (padrão: 2)
- **Tipo**: I/O-bound (API OpenAI Embeddings)
- **Implementação**: ConcurrencyPool
- **Ganho de Performance**: ~2x mais rápido
- **Rate Limiting**: Limite moderado para respeitar rate limits

**Como funciona**:
1. Busca todos os templates
2. Cria pool com limite de 2 workers (moderado para API)
3. Cada tarefa gera embeddings para um template (batch de 64 chunks)
4. Processa múltiplos templates simultaneamente

### ✅ filter-documents.ts

**Status**: Paralelizado

- **Concorrência**: `FILTER_CONCURRENCY` (padrão: 10)
- **Tipo**: I/O-bound (banco de dados)
- **Implementação**: ConcurrencyPool
- **Ganho de Performance**: ~10x mais rápido
- **Rate Limiting**: Não aplicável (operações rápidas no banco)

**Como funciona**:
1. Busca arquivos em status `processing`
2. Cria pool com limite de 10 workers (alto, operações rápidas)
3. Cada tarefa verifica wordCount e marca como rejeitado se necessário
4. Processa múltiplos arquivos simultaneamente

## Configuração

### Variáveis de Ambiente

Configure no `.env.local`:

```env
# Concorrência por script
WORKER_CONCURRENCY=6          # process-documents (padrão: 6)
CLASSIFY_CONCURRENCY=3        # classify-documents (padrão: 3)
EMBED_CONCURRENCY=2           # generate-embeddings (padrão: 2)
FILTER_CONCURRENCY=10         # filter-documents (padrão: 10)
MAX_RETRIES=3                 # Tentativas de retry (padrão: 3)
```

### Ajustando Concorrência

#### Para APIs Externas (OpenAI)

**classify-documents** e **generate-embeddings**:
- **Conservador**: 2-3 workers (evita rate limits)
- **Moderado**: 3-5 workers (se tiver rate limits generosos)
- **Agressivo**: 5-10 workers (não recomendado, pode causar rate limits)

#### Para Operações Locais

**process-documents**:
- **Recomendado**: Número de cores da CPU (4-8)
- **Máximo**: 2x número de cores (pode causar thrashing)

**filter-documents**:
- **Recomendado**: 10-20 (operações rápidas no banco)
- **Máximo**: Limitado por conexões do banco (`DB_MAX_CONNECTIONS`)

## Rate Limiting

### OpenAI API

#### GPT-5 (classify-documents)

- **Rate Limits**: Mais restritivos
- **Recomendação**: 3 workers paralelos
- **Retry Logic**: Implementado com backoff exponencial

#### Embeddings (generate-embeddings)

- **Rate Limits**: Mais generosos
- **Recomendação**: 2-3 workers paralelos
- **Batch Processing**: Já processa 64 chunks por requisição

### Estratégia

1. **Limite Conservador**: Comece com valores padrão
2. **Monitorar Erros**: Se ver muitos rate limits, reduza concorrência
3. **Aumentar Gradualmente**: Se não houver rate limits, pode aumentar
4. **Retry Automático**: O sistema já implementa retry com backoff

## Performance

### Antes da Paralelização

- **process-documents**: ~1 arquivo por vez
- **classify-documents**: ~1 documento por vez
- **generate-embeddings**: ~1 template por vez
- **filter-documents**: ~1 arquivo por vez

### Depois da Paralelização

- **process-documents**: ~6 arquivos simultâneos
- **classify-documents**: ~3 documentos simultâneos
- **generate-embeddings**: ~2 templates simultâneos
- **filter-documents**: ~10 arquivos simultâneos

### Ganhos Estimados

- **process-documents**: ~6x mais rápido
- **classify-documents**: ~3x mais rápido
- **generate-embeddings**: ~2x mais rápido
- **filter-documents**: ~10x mais rápido

**Total**: Pipeline completo ~3-4x mais rápido

## Monitoramento

### Progresso em Tempo Real

Todos os scripts exibem progresso em tempo real:

```
📊 Progresso: 150/1000 (15%) | Em processamento: 6 | Falhas: 2
```

### Estatísticas Finais

Ao final, cada script exibe:

```
✅ Processamento concluído em 45.32s
   ✓ Processados: 950
   ✗ Falhas: 10
   ⊘ Já processados: 40
```

### Debug

Para logs detalhados:

```env
DEBUG=true
```

Isso exibe:
- Stack traces completos
- Logs de retry
- Informações de cada tentativa

## Troubleshooting

### Rate Limits Frequentes

**Sintoma**: Muitos erros de rate limit

**Solução**:
1. Reduza `CLASSIFY_CONCURRENCY` ou `EMBED_CONCURRENCY`
2. Aumente `MAX_RETRIES` para mais tentativas
3. Verifique se há outros processos usando a mesma API key

### Workers Travando

**Sintoma**: Workers não completam, timeouts frequentes

**Solução**:
1. Reduza `WORKER_CONCURRENCY`
2. Verifique se há arquivos corrompidos
3. Aumente timeout (atualmente 60s)

### Banco de Dados Sobrecarregado

**Sintoma**: Erros de conexão, lentidão

**Solução**:
1. Reduza `FILTER_CONCURRENCY`
2. Aumente `DB_MAX_CONNECTIONS` no `.env.local`
3. Verifique conexões simultâneas no banco

### Memória Insuficiente

**Sintoma**: Erros de memória, crashes

**Solução**:
1. Reduza concorrência geral
2. Processe em lotes menores
3. Aumente memória disponível

## Boas Práticas

1. **Comece Conservador**: Use valores padrão inicialmente
2. **Monitore Performance**: Acompanhe tempo de execução e erros
3. **Ajuste Gradualmente**: Aumente concorrência se não houver problemas
4. **Respeite Rate Limits**: Não exceda limites de APIs externas
5. **Use Retry Logic**: O sistema já implementa, mas pode ajustar `MAX_RETRIES`

## Próximos Passos

- [ ] Monitoramento de métricas (tempo médio por tarefa, taxa de erro)
- [ ] Auto-ajuste de concorrência baseado em rate limits
- [ ] Dashboard de progresso em tempo real
- [ ] Alertas para erros frequentes

