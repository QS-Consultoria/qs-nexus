# Guia de Classificação de Documentos

Este guia documenta o processo de classificação de documentos jurídicos usando IA, incluindo decisões de design, limitações da API e soluções implementadas.

## Visão Geral

O sistema de classificação utiliza o AI SDK com modelos OpenAI (GPT-4-mini) para extrair metadados estruturados de documentos jurídicos em formato Markdown. A classificação gera um `TemplateDocument` completo com informações como tipo de documento, área jurídica, complexidade, tags, resumo e score de qualidade.

## Componente Principal

### `lib/services/classifier.ts`

O serviço de classificação é responsável por:

- Enviar documentos Markdown para a IA
- Extrair metadados estruturados
- Validar respostas da IA
- Tratar documentos grandes (truncamento)
- Logar progresso da classificação

## Decisões de Design Importantes

### 1. Envio de Conteúdo como Texto Direto

**Problema Original**: Tentativa de enviar o documento Markdown como arquivo anexado (`type: 'file'`) falhou porque a API do OpenAI não suporta arquivos de texto (`text/plain` ou `text/markdown`) em mensagens do usuário.

**Solução Implementada**: O conteúdo Markdown é enviado diretamente no corpo da mensagem de texto, sem usar o tipo `file`.

```typescript
// ❌ Não funciona (API não suporta)
{
  type: 'file',
  data: new Uint8Array(Buffer.from(markdown, 'utf-8')),
  mimeType: 'text/plain', // ou 'text/markdown'
}

// ✅ Solução implementada
content: `Analise o documento abaixo (formato Markdown)...\n\n---\n\n${markdown}`
```

**Nota**: A API do OpenAI suporta apenas arquivos PDF como anexos, não arquivos de texto. Para documentos de texto, o conteúdo deve ser incluído diretamente na mensagem.

### 2. Truncamento de Documentos Grandes

**Problema**: Documentos muito grandes podem exceder o limite de tokens do modelo (128k tokens para GPT-5), causando erros.

**Solução**: Implementação de truncamento inteligente que:

- Estima tokens antes de enviar (aproximação: 1 token ≈ 4 caracteres)
- Trunca preventivamente se exceder 100k tokens (reservando espaço para prompt e resposta)
- Mantém início e fim do documento (onde geralmente estão informações importantes)
- Tenta encontrar quebras naturais (fim de parágrafo) ao truncar
- Inclui marcador `[... conteúdo truncado por tamanho ...]` no meio

**Limite Configurado**: 100.000 tokens de entrada (conservador, deixando espaço para prompt e resposta)

**Fallback**: Se ainda ocorrer erro de limite de tokens, tenta novamente com versão ainda mais truncada (50% do limite original).

### 3. Validação de Respostas Vazias

**Problema**: A IA pode ocasionalmente retornar dados vazios ou inválidos, o que quebraria o pipeline.

**Solução**: Validação rigorosa que verifica se campos essenciais estão preenchidos:

- `title` não pode estar vazio
- `summary` não pode estar vazio
- `docType` deve estar presente
- `area` deve estar presente
- `complexity` deve estar presente
- `qualityScore` deve estar presente e válido

**Comportamento**: Se detectar dados vazios, o sistema:

- Loga detalhes completos da resposta recebida
- Inclui preview do markdown processado
- Para a classificação imediatamente para debug
- Lança erro descritivo

### 4. Logging de Progresso

**Problema**: Classificações podem demorar (dependem da IA), e não havia feedback sobre o progresso individual de cada documento.

**Solução**: Sistema de callbacks de progresso que permite logar início e fim de cada classificação.

**Implementação**:

- Parâmetro opcional `onProgress?: (message: string) => void` na função `classifyDocument`
- Logs de início: `"⏳ Iniciando classificação..."`
- Logs de fim: `"✅ Classificação concluída"`
- Logs aparecem no mesmo console, mas com quebra de linha para separar visualmente

**Expansão Futura**: A documentação menciona que logs mais detalhados podem ser implementados usando `streamObject` do AI SDK, que permite acompanhar o progresso em tempo real conforme cada campo é gerado pela IA.

### 5. Schema Zod e Campos Obrigatórios

**Problema**: A API do OpenAI exige que todos os campos nas `properties` do schema JSON estejam no array `required`. Campos com `.default()` ou `.optional()` causavam erros de schema.

**Solução**: Todos os campos do schema são obrigatórios, mas valores padrão são aplicados manualmente após receber a resposta:

```typescript
// Schema - todos os campos obrigatórios
const ClassificationSchema = z.object({
  jurisdiction: z.string(), // sem .default()
  tags: z.array(z.string()), // sem .default()
  sections: z.array(...), // sem .optional()
  // ...
});

// Aplicação de defaults após receber resposta
return {
  ...object,
  jurisdiction: object.jurisdiction || 'BR',
  tags: object.tags || [],
  sections: object.sections || [],
};
```

## Fluxo de Classificação

```
1. Documento Markdown
   ↓
2. Estimativa de Tokens
   ↓
3. Truncamento (se necessário)
   ↓
4. Log: "⏳ Iniciando classificação..."
   ↓
5. Chamada à IA (generateObject)
   ↓
6. Aplicação de Valores Padrão
   ↓
7. Validação de Resposta
   ↓
8. Log: "✅ Classificação concluída"
   ↓
9. Retorno ClassificationResult
```

## Tratamento de Erros

### Rate Limits

- Detecta erro de rate limit
- Aguarda 5 segundos
- Retenta automaticamente

### Limite de Tokens

- Detecta erro de limite de tokens
- Tenta com versão mais truncada (50% do limite)
- Se ainda falhar, propaga erro descritivo

### Respostas Vazias

- Valida campos essenciais
- Para processamento imediatamente
- Loga detalhes completos para debug

## Exemplo de Uso

```typescript
import { classifyDocument } from '../lib/services/classifier.js'

const markdown = '# Documento jurídico...'

// Com logging de progresso
const result = await classifyDocument(markdown, message => {
  console.log(`  ${message}`)
})

// Sem logging
const result = await classifyDocument(markdown)
```

## Output Esperado

```
📊 Progresso: 5/2416 (0%) | Em processamento: 3 | Falhas: 0

📝 Classificando: documento-123.docx
  ⏳ Iniciando classificação...
  ✅ Classificação concluída

📊 Progresso: 6/2416 (0%) | Em processamento: 3 | Falhas: 0
```

## Limitações Conhecidas

1. **Arquivos de Texto**: A API não suporta anexos de arquivos de texto, apenas PDFs
2. **Tamanho de Documentos**: Documentos muito grandes (>100k tokens) são truncados
3. **Rate Limits**: Depende da API da OpenAI, pode ter delays
4. **Custo**: Cada classificação consome tokens da API (custo variável)

## Melhorias Futuras

- [ ] Usar `streamObject` para logs mais detalhados (progresso por campo)
- [ ] Cache de classificações para evitar reprocessamento
- [ ] Retry com backoff exponencial para rate limits
- [ ] Métricas de tempo de resposta por documento
- [ ] Suporte para múltiplos modelos (fallback)

## Referências

- [AI SDK Documentation](https://ai-sdk.dev/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Zod Schema Validation](https://zod.dev/)
