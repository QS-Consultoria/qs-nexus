# Guia de Tracking de Modelos e Tokens

Este guia explica como o sistema rastreia informações sobre modelos e tokens usados na classificação de documentos.

## Visão Geral

O sistema agora rastreia automaticamente:
- **Provider**: Qual provider foi usado (OpenAI ou Google)
- **Modelo**: Qual modelo específico foi usado
- **Tokens de Input**: Quantos tokens foram usados na entrada
- **Tokens de Output**: Quantos tokens foram usados na saída

Essas informações são armazenadas no banco de dados e podem ser visualizadas no dashboard.

## Como Funciona

### Durante a Classificação

Quando um documento é classificado:

1. O sistema carrega a configuração de classificação ativa
2. Extrai o provider e modelo da configuração
3. Executa a classificação usando o AI SDK
4. Captura o objeto `usage` retornado pelo AI SDK (contém tokens)
5. Armazena todas essas informações no banco junto com o template

### Logs de Debug

Quando `DEBUG=true` (variável de ambiente), o sistema exibe logs detalhados:

```
[CLASSIFIER] Provider: openai
[CLASSIFIER] Model: gpt-4o
[CLASSIFIER] Classification Model: gpt-4o
[CLASSIFIER] Input tokens: 15234
[CLASSIFIER] Output tokens: 456
[CLASSIFIER] Total tokens: 15690
```

### Armazenamento no Banco

As informações são armazenadas na tabela `templates`:

- `model_provider`: Enum (openai, google)
- `model_name`: Text (ex: "gpt-4o", "gemini-2.0-flash-exp")
- `input_tokens`: Integer (tokens de entrada)
- `output_tokens`: Integer (tokens de saída)

**Nota**: Todas as colunas são nullable para compatibilidade com templates antigos.

## Visualização no Dashboard

### Estatísticas de Modelos

O dashboard exibe várias visualizações:

1. **Documentos por Provider**: Gráfico de barras mostrando quantos documentos foram classificados por cada provider
2. **Documentos por Modelo**: Gráfico de barras mostrando os top 10 modelos mais usados
3. **Distribuição de Tokens**: Gráfico de pizza mostrando input vs output
4. **Tokens por Provider**: Gráfico de barras empilhadas mostrando tokens por provider
5. **Tokens por Modelo**: Gráfico de barras empilhadas mostrando tokens por modelo (top 10)

### Acessando as Estatísticas

1. Acesse o dashboard (`/dashboard`)
2. Role até a seção "Estatísticas de Modelos e Tokens"
3. Visualize os gráficos interativos

## API de Estatísticas

### Endpoint

```
GET /api/documents/model-stats
```

### Resposta

```json
{
  "byProvider": [
    { "provider": "openai", "count": 1500 },
    { "provider": "google", "count": 865 }
  ],
  "byModel": [
    { "model": "gpt-4o", "provider": "openai", "count": 1200 },
    { "model": "gemini-2.0-flash-exp", "provider": "google", "count": 865 }
  ],
  "totalTokens": {
    "input": 15000000,
    "output": 500000,
    "total": 15500000
  },
  "tokensByProvider": [
    {
      "provider": "openai",
      "input": 12000000,
      "output": 400000,
      "total": 12400000
    },
    {
      "provider": "google",
      "input": 3000000,
      "output": 100000,
      "total": 3100000
    }
  ],
  "tokensByModel": [
    {
      "model": "gpt-4o",
      "provider": "openai",
      "input": 10000000,
      "output": 350000,
      "total": 10350000
    }
  ]
}
```

## Casos de Uso

### Análise de Custos

Use as estatísticas para:
- Identificar quais modelos estão consumindo mais tokens
- Comparar custos entre providers
- Otimizar escolha de modelos baseado em uso

### Otimização

Use os dados para:
- Identificar modelos mais eficientes
- Ajustar configurações de classificação
- Reduzir custos sem perder qualidade

### Debugging

Use os logs de debug para:
- Verificar qual modelo está sendo usado
- Identificar problemas de uso excessivo de tokens
- Troubleshooting de classificação

## Exemplos

### Verificar Tokens de um Template Específico

```sql
SELECT 
  title,
  model_provider,
  model_name,
  input_tokens,
  output_tokens,
  (input_tokens + output_tokens) as total_tokens
FROM templates
WHERE id = 'template-id';
```

### Estatísticas por Provider

```sql
SELECT 
  model_provider,
  COUNT(*) as total_documents,
  SUM(input_tokens) as total_input,
  SUM(output_tokens) as total_output,
  SUM(input_tokens + output_tokens) as total_tokens
FROM templates
WHERE model_provider IS NOT NULL
GROUP BY model_provider;
```

### Top 10 Modelos por Uso de Tokens

```sql
SELECT 
  model_name,
  model_provider,
  COUNT(*) as documents,
  SUM(input_tokens + output_tokens) as total_tokens
FROM templates
WHERE model_name IS NOT NULL
GROUP BY model_name, model_provider
ORDER BY total_tokens DESC
LIMIT 10;
```

## Troubleshooting

### Templates Antigos Sem Informações

Templates criados antes desta implementação não terão informações de modelo e tokens. Isso é esperado e não afeta o funcionamento.

### Tokens Não Aparecem

Se os tokens não aparecem:
1. Verifique se a classificação foi feita após a implementação
2. Verifique se o AI SDK retornou o objeto `usage`
3. Verifique os logs de debug para confirmar captura

### Gráficos Vazios

Se os gráficos estão vazios:
1. Verifique se há templates com informações de modelo
2. Verifique se a API está retornando dados
3. Verifique o console do navegador para erros

## Melhores Práticas

1. **Monitore Regularmente**: Acompanhe o uso de tokens para identificar tendências
2. **Otimize Modelos**: Use os dados para escolher modelos mais eficientes
3. **Configure Alertas**: Considere criar alertas para uso excessivo
4. **Analise Custos**: Use os dados para calcular custos mensais

## Referências

- [Documentação de Progresso](../implementation-progress/classificacao-configuravel-schema-dinamico.md#fase-8-tracking-de-modelos-e-tokens)
- [CHANGELOG](../CHANGELOG-2025-11-22.md)
- [API de Estatísticas](../reference/dashboard-api.md)

