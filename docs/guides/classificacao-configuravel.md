# Guia de Classificação Configurável

Este guia explica como usar o sistema de classificação configurável para documentos jurídicos.

---

## Visão Geral

O sistema de classificação configurável permite:

- **Múltiplos Providers**: Escolher entre OpenAI e Google/Gemini
- **Modelos Configuráveis**: Selecionar o modelo específico para classificação
- **System Prompt Customizado**: Personalizar as instruções para a IA
- **Função de Extração Customizada**: Criar função JavaScript para extrair partes relevantes do documento
- **Limites de Tokens**: Configurar limites específicos por modelo

---

## Acessando a Configuração

1. Acesse o dashboard
2. No menu lateral, clique em **"Settings"**
3. No submenu, clique em **"Classificação"**

Você verá a página de configuração de classificação com:
- Lista de configurações existentes
- Botão para criar nova configuração
- Formulário para editar configurações

---

## Criando uma Nova Configuração

### Passo 1: Informações Básicas

1. Clique em **"Nova Configuração"**
2. Preencha o **Nome** da configuração (ex: "Classificação GPT-4o")
3. Escreva o **System Prompt** que define como a IA deve classificar os documentos

**Exemplo de System Prompt**:
```
Você é um especialista em classificação de documentos jurídicos. 
Analise o documento e extraia as seguintes informações:
- Tipo do documento (petição inicial, contestação, recurso, etc.)
- Área jurídica (civil, trabalhista, tributário, etc.)
- Jurisdição (BR, TRT1, TJSP, etc.)
- Complexidade (simples, médio, complexo)
- Tags relevantes
- Resumo otimizado para embedding
- Nota de qualidade (0-100)
```

### Passo 2: Selecionar Modelo

1. Escolha o **Provider**:
   - **OpenAI**: Modelos GPT-4o, GPT-4o Mini
   - **Google**: Modelos Gemini 2.0 Flash, 2.0 Flash Lite, 2.5 Flash, 2.5 Flash Lite

2. Selecione o **Modelo** específico

3. O sistema exibirá automaticamente os **Limites de Tokens** do modelo selecionado:
   - **Max Input Tokens**: Máximo de tokens de entrada
   - **Max Output Tokens**: Máximo de tokens de saída

### Passo 3: Configurar Limites de Tokens

1. **Max Input Tokens**: Defina o limite máximo de tokens de entrada
   - O sistema valida automaticamente se o valor está dentro dos limites do modelo
   - Recomendado: Deixar um espaço para system prompt e margem de segurança

2. **Max Output Tokens**: Defina o limite máximo de tokens de saída
   - O sistema valida automaticamente se o valor está dentro dos limites do modelo
   - Recomendado: Valor suficiente para a resposta completa

**Nota**: O sistema valida automaticamente se os limites estão dentro das capacidades do modelo selecionado.

### Passo 4: Função de Extração (Opcional)

A função de extração permite personalizar como o sistema extrai partes relevantes do documento antes da classificação.

1. **Função Padrão**: Se deixar vazio, o sistema usa a função padrão que extrai:
   - Início do documento (3000 caracteres)
   - Estrutura de seções (títulos H1, H2)
   - Fim do documento (3000 caracteres)

2. **Função Customizada**: Você pode escrever uma função JavaScript customizada:

```javascript
/**
 * Extrai partes relevantes do markdown para classificação
 * @param {string} markdown - Conteúdo completo do documento em Markdown
 * @returns {string} - Conteúdo extraído otimizado para classificação
 */
function extractRelevantContent(markdown) {
  // Exemplo: Extrair apenas títulos e primeiros parágrafos de cada seção
  const lines = markdown.split('\n');
  const relevant = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Inclui títulos
    if (line.startsWith('#') || line.startsWith('##')) {
      relevant.push(line);
    }
    // Inclui primeiros parágrafos após títulos
    else if (relevant.length > 0 && line.trim() && !line.startsWith('#')) {
      relevant.push(line);
      // Limita a 2 parágrafos por seção
      if (relevant.filter(l => !l.startsWith('#')).length >= 2) {
        break;
      }
    }
  }
  
  return relevant.join('\n');
}
```

**Restrições de Segurança**:
- Não pode usar `require`, `import`, `eval`, `Function`, etc.
- Apenas operações seguras em strings são permitidas
- O sistema valida o código antes de salvar

### Passo 5: Ativar Configuração

1. Marque **"Configuração Ativa"** se deseja que esta seja a configuração padrão
2. **Nota**: Apenas uma configuração pode estar ativa por vez. Ao ativar uma, as outras são desativadas automaticamente.

### Passo 6: Salvar

1. Clique em **"Salvar"**
2. O sistema valida:
   - Campos obrigatórios
   - Limites de tokens (dentro dos limites do modelo)
   - Código JavaScript (se fornecido)

---

## Editando uma Configuração

1. Na lista de configurações, clique em **"Editar"** na configuração desejada
2. Faça as alterações necessárias
3. Clique em **"Salvar"**

**Nota**: Ao editar uma configuração ativa, as mudanças são aplicadas imediatamente para novas classificações.

---

## Deletando uma Configuração

1. Na lista de configurações, clique em **"Deletar"** na configuração desejada
2. Confirme a exclusão no diálogo
3. **Atenção**: Não é possível deletar a configuração ativa. Desative-a primeiro.

---

## Usando uma Configuração

### Via API

Ao classificar um documento via API, você pode especificar o `configId`:

```typescript
POST /api/classification/classify
{
  "markdown": "...",
  "configId": "uuid-da-configuracao" // opcional, usa ativa se não fornecido
}
```

### Via Scripts

Os scripts de classificação usam automaticamente a configuração ativa:

```bash
npm run rag:classify
```

---

## Como o Sistema Funciona

### 1. Preparação de Conteúdo

Antes de classificar, o sistema:

1. **Estima Tokens**: Usa tiktoken para estimar tokens do documento
2. **Calcula Tokens Disponíveis**: Considera system prompt, user prompt e margem para output
3. **Decide Estratégia**:
   - Se documento cabe: usa documento completo
   - Se não cabe: usa função de extração ou truncamento inteligente

### 2. Truncamento Inteligente

Se o documento for muito grande:

1. O sistema calcula quantos tokens podem ser usados
2. Decide entre:
   - **Extração**: Usa função de extração (padrão ou customizada)
   - **Truncamento Direto**: Trunca mantendo início (40%) e fim (60%)

### 3. Classificação

1. O sistema carrega a configuração (ativa ou especificada)
2. Prepara o conteúdo usando a estratégia escolhida
3. Chama a API de IA com:
   - System prompt da configuração
   - Conteúdo preparado
   - Schema dinâmico do template
4. Valida a resposta
5. Retorna o resultado

---

## Dicas e Melhores Práticas

### System Prompt

- **Seja Específico**: Defina claramente o que você quer extrair
- **Exemplos**: Inclua exemplos quando possível
- **Formato**: Especifique o formato esperado da resposta

### Limites de Tokens

- **Margem de Segurança**: Deixe espaço para system prompt e margem de erro
- **Output Tokens**: Garanta espaço suficiente para a resposta completa
- **Validação**: O sistema valida automaticamente, mas é bom verificar

### Função de Extração

- **Teste Antes**: Teste a função com documentos reais
- **Performance**: Funções simples são mais rápidas
- **Segurança**: Lembre-se das restrições de segurança

### Modelos

- **OpenAI**: Geralmente melhor para classificação estruturada
- **Google Gemini**: Boa alternativa, especialmente para documentos longos
- **Custo**: Considere o custo por token ao escolher o modelo

---

## Troubleshooting

### Erro: "Limites de tokens inválidos"

- Verifique se os limites estão dentro das capacidades do modelo
- O sistema exibe os limites máximos do modelo selecionado

### Erro: "Código JavaScript inválido"

- Verifique se não está usando funções bloqueadas (require, import, eval, etc.)
- Use apenas operações seguras em strings

### Classificação Retornando Dados Vazios

- Verifique o system prompt
- Verifique se o modelo selecionado suporta o formato esperado
- Tente aumentar os limites de tokens de saída

### Performance Lenta

- Considere usar função de extração para reduzir tokens
- Use modelos mais rápidos (GPT-4o Mini, Gemini Flash Lite)
- Verifique se o truncamento está funcionando corretamente

---

## Referências

- [Tech Specs](../architecture/TECH-SPECS-CLASSIFICACAO.md)
- [PRD](../architecture/PRD-CLASSIFICACAO-CONFIGURAVEL.md)
- [API Reference](../reference/classification-api.md)

