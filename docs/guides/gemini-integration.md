# Guia de Integração com Google Gemini

Este guia descreve como usar a integração do Google Gemini para estruturação de markdown e no chat RAG.

## Visão Geral

O sistema integra o Google Gemini em duas áreas principais:

1. **Estruturação de Markdown**: Usa Gemini 2.0 Flash para estruturar texto extraído de PDFs e documentos .doc
2. **Chat RAG**: Suporta múltiplos modelos Gemini para geração de respostas

## Configuração

### Variáveis de Ambiente

Adicione a seguinte variável ao seu `.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### Obter API Key

1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crie uma nova API key
3. Copie a chave e adicione ao `.env.local`

## Estruturação de Markdown

### Como Funciona

Quando um PDF ou documento .doc é processado, o sistema:

1. Extrai o texto usando `pdf-parse` ou `textract`
2. **Opcionalmente** estrutura o texto usando Gemini 2.0 Flash
3. Gera markdown bem formatado com títulos, parágrafos, listas, etc.

### Quando é Usado

A estruturação com Gemini é usada quando:

- `GOOGLE_GENERATIVE_AI_API_KEY` está configurada
- O documento é um PDF ou .doc (não DOCX)
- O texto extraído precisa de estruturação

### Fallback

Se a API key não estiver configurada ou se houver erro:

- O sistema usa formatação básica
- O processamento continua normalmente
- Nenhum erro é gerado

### Limites

- **Limite de Tokens**: 875k tokens (dentro do limite de 1M do Gemini)
- **Truncamento Automático**: Textos muito grandes são truncados automaticamente
- **Contagem Precisa**: Usa `tiktoken` para contagem precisa de tokens

### Modelos Usados

1. **Gemini 2.0 Flash** (primário)
2. **Gemini 2.0 Flash Lite** (fallback)

## Chat RAG

### Modelos Disponíveis

O chat suporta os seguintes modelos Gemini:

- **Gemini 2.0 Flash**: Modelo rápido e eficiente
- **Gemini 2.0 Flash Lite**: Versão mais leve e econômica
- **Gemini 2.5 Flash**: Versão mais recente e melhorada
- **Gemini 2.5 Flash Lite**: Versão lite da 2.5

### Como Usar

1. Acesse a página de chat (`/chat`)
2. Selecione o modelo Gemini desejado no seletor
3. Faça sua pergunta normalmente

### Comparação com OpenAI

| Característica | OpenAI | Gemini |
|---------------|--------|--------|
| Modelo Padrão | GPT-4o Mini | N/A (não é padrão) |
| Modelos Disponíveis | GPT-4o, GPT-4o Mini | 2.0/2.5 Flash, Lite |
| Custo | Variável | Geralmente mais barato |
| Performance | Excelente | Muito boa |
| Rate Limits | Sim | Sim |

### Quando Usar Cada Modelo

**Gemini 2.0/2.5 Flash Lite**:
- Uso geral e econômico
- Respostas rápidas
- Ideal para perguntas simples

**Gemini 2.0/2.5 Flash**:
- Tarefas mais complexas
- Melhor qualidade de resposta
- Ainda rápido

**OpenAI GPT-4o**:
- Máxima qualidade
- Tarefas muito complexas
- Quando precisar da melhor resposta possível

## Troubleshooting

### Erro: "GOOGLE_GENERATIVE_AI_API_KEY não está configurada"

**Solução**: Adicione a variável de ambiente no `.env.local` e reinicie o servidor.

### Estruturação não está funcionando

**Verificações**:
1. API key está configurada corretamente?
2. API key é válida?
3. Há créditos disponíveis na conta Google AI?
4. Verifique os logs do servidor para erros específicos

### Chat com Gemini não responde

**Verificações**:
1. API key está configurada?
2. Modelo selecionado está disponível?
3. Há rate limits sendo atingidos?
4. Verifique os logs do servidor

### Texto muito grande sendo truncado

**Explicação**: O Gemini tem limite de 1M tokens. O sistema trunca automaticamente textos maiores que 875k tokens para deixar margem para o prompt.

**Solução**: Não há solução automática. O texto será truncado mantendo o máximo de conteúdo possível.

## Custos

### Estruturação de Markdown

- **Modelo**: Gemini 2.0 Flash
- **Custo**: Verifique os preços atuais em [Google AI Pricing](https://ai.google.dev/pricing)
- **Uso**: Apenas para PDFs e .doc que precisam de estruturação

### Chat RAG

- **Modelos**: Variam por modelo
- **Custo**: Geralmente mais barato que OpenAI
- **Uso**: Por requisição de chat

## Melhores Práticas

1. **Configure a API Key**: Mesmo que opcional, a estruturação com Gemini melhora significativamente a qualidade do markdown
2. **Monitore Custos**: Acompanhe o uso da API para evitar surpresas
3. **Use Modelos Apropriados**: Use Flash Lite para uso geral, Flash para tarefas complexas
4. **Teste Diferentes Modelos**: Experimente diferentes modelos para encontrar o melhor para seu caso de uso
5. **Fallback**: O sistema funciona sem Gemini, mas a qualidade pode ser menor

## Referências

- [Google AI Documentation](https://ai.google.dev/docs)
- [AI SDK Google Provider](https://ai-sdk.dev/docs/providers/google)
- [Gemini Models](https://ai.google.dev/models/gemini)

