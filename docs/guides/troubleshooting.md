# Guia de Troubleshooting e Scripts Utilitários

Este guia documenta as correções implementadas para problemas de processamento, scripts utilitários criados e seus casos de uso.

## Problema Identificado: Arquivos no Limbo

### Descrição do Problema

Arquivos ficavam presos em status `processing` sem serem processados ou marcados como rejeitados, criando um estado de "limbo" onde:

1. **Arquivos com erro no processamento**: Falhavam na conversão DOCX → Markdown mas não eram marcados como rejeitados
2. **Arquivos com erro na classificação**: Tinham markdown temporário mas falhavam na classificação e não eram marcados como rejeitados
3. **Consequência**: Esses arquivos ficavam em `processing` indefinidamente, sendo pulados em execuções subsequentes

### Causa Raiz

1. **`process-documents.ts`**: O callback `onTaskFailed` do `ConcurrencyPool` não estava marcando corretamente os arquivos como rejeitados quando havia erros na extração do caminho do arquivo
2. **`classify-documents.ts`**: Não tinha tratamento de erros e não tinha callback `onTaskFailed` configurado, então arquivos que falhavam na classificação não eram marcados como rejeitados

## Correções Implementadas

### 1. Correção no `process-documents.ts`

#### Mudanças Realizadas

**a) Verificação de arquivos em processing sem markdown:**
- Adicionada verificação se arquivo já está em `processing` mas não tem markdown temporário
- Se não tiver markdown, tenta processar novamente (pode ter sido falha temporária)
- Se tiver markdown, considera já processado e pula

```typescript
// Se está como "processing" mas não tem markdown temporário, 
// significa que falhou anteriormente - vamos tentar processar novamente
if (existing.status === 'processing') {
  const existingMarkdown = readTemporaryMarkdown(existing.fileHash);
  if (!existingMarkdown) {
    // Continua para tentar processar novamente
  } else {
    // Tem markdown, já foi processado com sucesso
    return null;
  }
}
```

**b) Melhorias no callback `onTaskFailed`:**
- Logs mais detalhados ao marcar como rejeitado
- Tratamento de erros ao marcar como rejeitado
- Validação da extração do `filePath` do `taskId`
- Mensagens de erro mais informativas

```typescript
onTaskFailed: async (taskId, errorMessage) => {
  const match = taskId.match(/^file-\d+-(.+)$/);
  if (match) {
    const filePath = match[1];
    const normalizedPath = normalizeFilePath(filePath, PROJECT_ROOT);
    
    try {
      await markFileRejected(normalizedPath, errorMessage);
      console.error(`[POOL] ✅ Arquivo marcado como rejeitado: ${fileName}`);
      console.error(`[POOL]    Motivo: ${errorMessage.substring(0, 100)}...`);
    } catch (rejectError) {
      console.error(`[POOL] ❌ ERRO ao marcar como rejeitado: ${fileName}`);
      // Logs detalhados do erro
    }
  } else {
    console.error(`[POOL] ⚠️  Não foi possível extrair filePath do taskId: ${taskId}`);
  }
}
```

#### Casos de Uso

- **Processamento normal**: Arquivos que falharem após todas as tentativas de retry são automaticamente marcados como rejeitados
- **Arquivos em limbo**: Arquivos que estão em `processing` sem markdown são detectados e tentam processar novamente
- **Debug**: Logs detalhados ajudam a identificar problemas na marcação de rejeição

### 2. Correção no `classify-documents.ts`

#### Mudanças Realizadas

**a) Tratamento de erros na função `classifyDocumentTask`:**
- Adicionado `try-catch` para capturar erros durante a classificação
- Erros são re-lançados para que o `ConcurrencyPool` possa tratá-los
- Logs de erro detalhados

```typescript
async function classifyDocumentTask(file: InferSelectModel<typeof documentFiles>): Promise<ClassifyResult> {
  try {
    // ... lógica de classificação ...
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[CLASSIFY] ERRO ao classificar ${file.filePath}: ${errorMsg}`);
    throw new Error(`Erro ao classificar ${file.filePath}: ${errorMsg}`);
  }
}
```

**b) Callback `onTaskFailed` no `ConcurrencyPool`:**
- Extrai `fileId` do `taskId` (formato: `classify-{fileId}`)
- Busca o arquivo no banco de dados
- Marca como rejeitado com motivo descritivo
- Logs detalhados de sucesso e erro

```typescript
onTaskFailed: async (taskId, errorMessage) => {
  const match = taskId.match(/^classify-(.+)$/);
  if (match) {
    const fileId = match[1];
    const file = await db.select().from(documentFiles).where(eq(documentFiles.id, fileId)).limit(1);
    
    if (file[0]) {
      await markFileRejected(
        file[0].filePath,
        `Falha na classificação após múltiplas tentativas: ${errorMessage}`
      );
      console.error(`[POOL] ✅ Arquivo marcado como rejeitado: ${file[0].fileName}`);
    }
  }
}
```

#### Casos de Uso

- **Classificação normal**: Arquivos que falharem na classificação após todas as tentativas são automaticamente marcados como rejeitados
- **Erros de API**: Erros de rate limit, limite de tokens, ou outros erros da API são tratados e arquivos são marcados como rejeitados
- **Debug**: Logs detalhados ajudam a identificar problemas específicos na classificação

## Scripts Utilitários Criados

### 1. `reject-failed-processing.ts`

#### Descrição

Script utilitário para marcar como rejeitados arquivos que estão em status `processing` mas falharam em alguma etapa do pipeline.

#### Funcionalidades

- **Detecta arquivos no limbo**: Busca todos os arquivos em status `processing`
- **Identifica falhas no processamento**: Arquivos sem markdown temporário (falharam na conversão DOCX → Markdown)
- **Identifica falhas na classificação**: Arquivos com markdown mas sem template (falharam na classificação)
- **Marca como rejeitado**: Marca arquivos com motivo descritivo explicando o tipo de falha
- **Ignora arquivos válidos**: Arquivos com template são ignorados (serão corrigidos pelo `classify`)

#### Uso

```bash
npm run rag:reject-failed
```

#### Output Esperado

```
🔧 Marcando como rejeitados arquivos em "processing" que falharam...

📄 Verificando 58 arquivos...

   ✓ Rejeitados: 10...
   ✓ Rejeitados: 20...
   ✓ Rejeitados: 30...
   ✓ Rejeitados: 40...
   ✓ Rejeitados: 50...

✅ Processo concluído:
   ✗ Marcados como rejeitados: 58
      - Sem markdown (falhou no processamento): 0
      - Com markdown mas sem template (falhou na classificação): 58
   ⊘ Com template (serão corrigidos): 0
```

#### Casos de Uso

1. **Limpeza após falhas em massa**: Quando muitos arquivos falharem e ficarem no limbo
2. **Correção manual**: Para corrigir arquivos que ficaram presos em `processing` antes das correções
3. **Manutenção periódica**: Executar periodicamente para limpar arquivos órfãos

#### Motivos de Rejeição

- **Sem markdown**: `"Falhou no processamento: arquivo ficou em status 'processing' sem markdown temporário gerado. Provavelmente erro na conversão DOCX para Markdown."`
- **Com markdown mas sem template**: `"Falhou na classificação: arquivo tem markdown temporário mas não foi classificado com sucesso após múltiplas tentativas."`

### 2. Scripts Utilitários Existentes (Referência)

#### `investigate-processing.ts`

Investiga arquivos em status `processing` e fornece estatísticas detalhadas.

**Uso**: `npm run rag:investigate`

**Output**: Estatísticas sobre arquivos com/sem template, com/sem markdown, wordCount, etc.

#### `fix-processing-status.ts`

Corrige status de arquivos que têm template mas ainda estão em `processing` (marca como `completed`).

**Uso**: `npm run rag:fix-status`

**Output**: Arquivos corrigidos de `processing` para `completed`

#### `reset-missing-markdown.ts`

Reseta status de arquivos em `processing` sem markdown temporário para `pending` (permite reprocessamento).

**Uso**: `npm run rag:reset-missing`

**Output**: Arquivos resetados de `processing` para `pending`

**Nota**: Diferente de `reject-failed-processing.ts`, este script **reseta** para permitir reprocessamento, enquanto `reject-failed-processing.ts` **marca como rejeitado** (nunca será reprocessado).

## Fluxo de Correção de Arquivos no Limbo

### Cenário 1: Arquivos sem Markdown (Falhou no Processamento)

```
1. Arquivo em processing sem markdown
   ↓
2. Opção A: Executar `npm run rag:reject-failed`
   → Marca como rejeitado (nunca será reprocessado)
   ↓
3. Opção B: Executar `npm run rag:reset-missing`
   → Reseta para pending (permite reprocessamento)
   ↓
4. Executar `npm run rag:process`
   → Tenta processar novamente
```

### Cenário 2: Arquivos com Markdown mas sem Template (Falhou na Classificação)

```
1. Arquivo em processing com markdown mas sem template
   ↓
2. Executar `npm run rag:reject-failed`
   → Marca como rejeitado com motivo específico
   ↓
3. (Opcional) Se quiser tentar novamente:
   → Executar `npm run rag:reprocess "./caminho/do/arquivo.docx"`
```

### Cenário 3: Arquivos com Template mas em Processing (Status Incorreto)

```
1. Arquivo em processing mas com template
   ↓
2. Executar `npm run rag:fix-status`
   → Marca como completed
```

## Prevenção de Problemas Futuros

### Com as Correções Implementadas

1. **Processamento**: Arquivos que falharem no processamento são automaticamente marcados como rejeitados após todas as tentativas
2. **Classificação**: Arquivos que falharem na classificação são automaticamente marcados como rejeitados após todas as tentativas
3. **Logs**: Logs detalhados ajudam a identificar problemas rapidamente
4. **Detecção**: Arquivos em `processing` sem markdown são detectados e tentam processar novamente

### Boas Práticas

1. **Monitoramento**: Execute `npm run rag:investigate` periodicamente para verificar arquivos em `processing`
2. **Limpeza**: Execute `npm run rag:reject-failed` após falhas em massa para limpar arquivos no limbo
3. **Correção**: Execute `npm run rag:fix-status` para corrigir arquivos com template mas status incorreto
4. **Debug**: Use `DEBUG=true npm run rag:process` ou `DEBUG=true npm run rag:classify` para logs detalhados

## Comandos Úteis

### Investigação

```bash
# Ver estatísticas de arquivos em processing
npm run rag:investigate

# Ver relatório completo de status
npm run rag:status
```

### Correção

```bash
# Marcar arquivos no limbo como rejeitados
npm run rag:reject-failed

# Corrigir arquivos com template mas status incorreto
npm run rag:fix-status

# Resetar arquivos sem markdown para permitir reprocessamento
npm run rag:reset-missing
```

### Reprocessamento

```bash
# Reprocessar arquivo específico
npm run rag:reprocess "./caminho/do/arquivo.docx"

# Reprocessar todos os arquivos pendentes
npm run rag:process
```

## Troubleshooting Comum

### Problema: Muitos arquivos em `processing`

**Solução**:
1. Execute `npm run rag:investigate` para entender o problema
2. Execute `npm run rag:reject-failed` para limpar arquivos no limbo
3. Execute `npm run rag:fix-status` para corrigir arquivos com template

### Problema: Arquivos sendo pulados no classify

**Causa**: Arquivos podem estar sem markdown temporário ou já terem template

**Solução**:
1. Execute `npm run rag:investigate` para verificar
2. Se sem markdown: execute `npm run rag:reset-missing` e depois `npm run rag:process`
3. Se com template: execute `npm run rag:fix-status`

### Problema: Arquivos falhando repetidamente

**Causa**: Arquivos podem estar corrompidos ou ter problemas específicos

**Solução**:
1. Verifique logs detalhados com `DEBUG=true`
2. Arquivos serão automaticamente marcados como rejeitados após todas as tentativas
3. Execute `npm run rag:reject-failed` para limpar manualmente se necessário

## Referências

- [Guia de Classificação](./classificacao.md) - Detalhes sobre o processo de classificação
- [Guia de Paralelização](./paralelizacao.md) - Detalhes sobre processamento paralelo
- [ConcurrencyPool](../reference/concurrency-pool.md) - Documentação do pool de concorrência
- [README](../README.md) - Visão geral do sistema

