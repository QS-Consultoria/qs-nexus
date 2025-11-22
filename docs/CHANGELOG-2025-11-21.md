# Changelog - 21 de Novembro de 2025

## Resumo Executivo

Este documento descreve todas as mudanças implementadas no dia 21 de novembro de 2025, desde o commit inicial `233c9948f116897f775d276ed288b531b8bb7ac8` até o commit final `453acf3068ed553f211d86d29aad22ed6006168a`.

### Estatísticas

- **Total de commits**: 15 commits
- **Arquivos modificados**: 68 arquivos
- **Linhas adicionadas**: 4.092 linhas
- **Linhas removidas**: 1.713 linhas
- **Líquido**: +2.379 linhas

## Principais Funcionalidades Implementadas

### 1. Integração do Google Gemini para Estruturação de Markdown

**Commits relacionados**: 
- `ce34f818f97dbf19c7b05c682def6ff16feb37be` - pdf doc gemini markdown
- `a65777b18f2a6a1cc391576a35bf76d880d4f5eb` - pdf doc gemini markdown
- `1d6f19f2c1a6ae576f6a351efe628f1e08245540` - pdf doc

**Arquivos criados/modificados**:
- `lib/services/markdown-structurer.ts` (novo)
- `lib/services/document-converter.ts` (modificado)
- `lib/workers/document-converter-worker.ts` (modificado)

**Descrição**:
Implementação de um serviço que usa o Google Gemini 2.0 Flash para estruturar texto extraído de PDFs e documentos .doc em markdown bem formatado. O serviço:

- Usa o modelo Gemini 2.0 Flash (com fallback para Gemini 2.0 Flash Lite)
- Suporta até 875k tokens (dentro do limite de 1M do Gemini)
- Trunca automaticamente textos muito grandes usando contagem precisa de tokens (tiktoken)
- Preserva estrutura do documento (títulos, parágrafos, listas, tabelas)
- Funciona como fallback opcional - se a API key não estiver configurada, usa formatação básica

**Configuração necessária**:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

**Impacto**:
- Melhora significativa na qualidade do markdown gerado a partir de PDFs e .doc
- Estruturação automática de documentos que antes eram apenas texto plano
- Melhor preservação de hierarquia e formatação

### 2. Suporte a Múltiplos Modelos de Chat

**Commits relacionados**:
- `453acf3068ed553f211d86d29aad22ed6006168a` - adicionando gemini como model chat, preview de markdown

**Arquivos criados/modificados**:
- `lib/types/chat-models.ts` (novo)
- `app/api/chat/route.ts` (modificado)
- `components/chat/chat-interface.tsx` (modificado)

**Descrição**:
Implementação de um sistema flexível de seleção de modelos de chat, permitindo que o usuário escolha entre diferentes modelos da OpenAI e Google:

**Modelos suportados**:
- OpenAI GPT-4o Mini (padrão)
- OpenAI GPT-4o
- Google Gemini 2.0 Flash
- Google Gemini 2.0 Flash Lite
- Google Gemini 2.5 Flash
- Google Gemini 2.5 Flash Lite

**Funcionalidades**:
- Seletor de modelo na interface do chat
- Integração com AI SDK para suporte a múltiplos providers
- Labels amigáveis para cada modelo
- Fallback automático para GPT-4o Mini se o modelo selecionado não estiver disponível

**Impacto**:
- Maior flexibilidade para o usuário escolher o modelo mais adequado
- Suporte a modelos mais baratos (Gemini Flash Lite) para uso geral
- Suporte a modelos mais poderosos (GPT-4o, Gemini 2.5) para tarefas complexas

### 3. Preview de Markdown na Interface

**Commits relacionados**:
- `453acf3068ed553f211d86d29aad22ed6006168a` - adicionando gemini como model chat, preview de markdown

**Arquivos modificados**:
- `app/(dashboard)/files/[id]/page.tsx` (modificado)

**Descrição**:
Implementação de visualização e edição de markdown na página de detalhes do arquivo:

**Funcionalidades**:
- **Modo Preview**: Visualização renderizada do markdown usando `react-markdown`
- **Modo Code**: Visualização do código markdown bruto
- **Edição**: Edição inline do markdown com salvamento
- **Toggle**: Botão para alternar entre preview e código

**Impacto**:
- Melhor experiência do usuário para visualizar documentos processados
- Possibilidade de editar markdown diretamente na interface
- Facilita correção de erros de conversão

### 4. Reprocessamento Completo de Documentos

**Commits relacionados**:
- `2cdbae0a61f65b16e47510bfb80eaac031d97028` - doc progress up;pad
- `be38cf7c9a2926ae550a8e48d045b911c16167a0` - doc progress up;pad
- `278796e5c73af2164d71ed2233b9412a6b8b55fe` - doc progress up;pad
- `ae0eeb8d6d4a58f8ca999bb5487a98ac8ef2741d` - doc progress up;pad

**Arquivos criados/modificados**:
- `app/api/documents/[id]/reprocess-full/route.ts` (novo)
- `app/(dashboard)/files/[id]/page.tsx` (modificado)

**Descrição**:
Implementação de funcionalidade para reprocessar completamente um documento, permitindo:

- Upload de novo arquivo para substituir o existente
- Reprocessamento completo (conversão, classificação, chunking, embeddings)
- Deletar chunks antigos antes de reprocessar
- Validação de formato (DOCX, DOC, PDF)
- Validação de tamanho (máximo 50MB)
- Processamento assíncrono em segundo plano

**Impacto**:
- Permite correção de documentos mal processados
- Facilita atualização de documentos
- Melhora a qualidade dos dados no sistema

### 5. Regeneração de Chunks e Embeddings

**Commits relacionados**:
- `2cdbae0a61f65b16e47510bfb80eaac031d97028` - doc progress up;pad

**Arquivos criados/modificados**:
- `app/api/documents/[id]/regenerate-chunks/route.ts` (novo)
- `app/(dashboard)/files/[id]/page.tsx` (modificado)

**Descrição**:
Implementação de funcionalidade para regenerar chunks e embeddings de um documento já processado:

**Funcionalidades**:
- Deleta chunks e embeddings antigos
- Gera novos chunks a partir do markdown atual
- Gera novos embeddings para os chunks
- Armazena os novos chunks no banco de dados
- Retorna contagem de chunks criados

**Impacto**:
- Permite atualizar chunks sem reprocessar o documento completo
- Útil quando o markdown foi editado manualmente
- Facilita ajuste de estratégia de chunking

### 6. Melhorias no Frontend

**Commits relacionados**:
- `3dc2658a56688b57450a6f44710cff6eb7d4b04b` - refact front
- `98688f5ba8f35db451f49708f6a953997fe85426` - refact front
- `d7ed7ad8b9cd5ca1a2fc5334cc80819e1bd96036` - fix theme
- `9f1523a480ed4a18d91a0fead96e16d5dcb74bea` - excluir aruiqvo

**Arquivos modificados**:
- `components/files/file-list.tsx` (modificado)
- `components/files/file-list-pagination.tsx` (novo)
- `app/(dashboard)/files/page.tsx` (modificado)
- `components/layout/navbar.tsx` (modificado)
- `components/layout/sidebar.tsx` (modificado)
- `components/providers/theme-provider.tsx` (novo)
- `app/globals.css` (modificado)
- `app/layout.tsx` (modificado)

**Melhorias implementadas**:

1. **Paginação de Arquivos**:
   - Componente de paginação completo e reutilizável
   - Navegação com botões primeira/última página
   - Indicadores visuais da página atual
   - Suporte a grandes volumes de dados

2. **Sistema de Tema**:
   - Suporte a tema claro/escuro
   - Provider de tema usando next-themes
   - Persistência de preferência do usuário
   - Toggle de tema na interface

3. **Refatoração de Componentes**:
   - Melhor organização de componentes
   - Separação de responsabilidades
   - Melhor reutilização de código
   - Melhorias de performance

4. **Funcionalidade de Exclusão**:
   - Exclusão de arquivos com confirmação
   - Exclusão em cascata (arquivo, template, chunks)
   - Feedback visual durante exclusão
   - Atualização automática da lista

**Impacto**:
- Melhor experiência do usuário
- Interface mais moderna e responsiva
- Melhor organização do código
- Facilita manutenção futura

## Detalhes Técnicos

### Novas Dependências

```json
{
  "@ai-sdk/google": "^1.0.0",
  "react-markdown": "^9.0.0",
  "next-themes": "^0.2.0",
  "tiktoken": "^1.0.0"
}
```

### Novos Serviços

1. **`markdown-structurer.ts`**:
   - Estruturação de texto usando Gemini
   - Contagem precisa de tokens
   - Truncamento inteligente

2. **`chat-models.ts`**:
   - Enum de modelos suportados
   - Funções de conversão para providers
   - Labels amigáveis

### Novas APIs

1. **`POST /api/documents/[id]/reprocess-full`**:
   - Reprocessamento completo de documento
   - Upload de novo arquivo
   - Processamento assíncrono

2. **`POST /api/documents/[id]/regenerate-chunks`**:
   - Regeneração de chunks e embeddings
   - Baseado no markdown atual

### Modificações em APIs Existentes

1. **`POST /api/chat`**:
   - Suporte a seleção de modelo
   - Integração com múltiplos providers

2. **`PUT /api/documents/[id]`**:
   - Atualização de markdown
   - Validação de dados

3. **`DELETE /api/documents/[id]`**:
   - Exclusão em cascata
   - Limpeza de dados relacionados

## Impacto na Arquitetura

### Processamento de Documentos

O pipeline de processamento agora inclui uma etapa opcional de estruturação com Gemini:

```
Documento (PDF/DOC)
  ↓
Extração de Texto (pdf-parse/textract)
  ↓
[Opcional] Estruturação com Gemini (se API key configurada)
  ↓
Markdown Estruturado
  ↓
Classificação → Chunking → Embeddings
```

### Chat RAG

O sistema de chat agora suporta múltiplos modelos, permitindo:

- Escolha do modelo pelo usuário
- Fallback automático
- Suporte a diferentes providers (OpenAI, Google)

### Interface do Usuário

A interface foi significativamente melhorada com:

- Preview de markdown
- Edição inline
- Tema claro/escuro
- Paginação robusta
- Melhor feedback visual

## Configuração Necessária

### Variáveis de Ambiente

```env
# Google Gemini (opcional, mas recomendado para melhor qualidade)
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# OpenAI (já existente)
OPENAI_API_KEY=your_api_key_here
```

### Instalação de Dependências

```bash
npm install @ai-sdk/google react-markdown next-themes tiktoken
```

## Próximos Passos Recomendados

1. **Testes**:
   - Testar estruturação com Gemini em diferentes tipos de documentos
   - Validar qualidade do markdown gerado
   - Testar todos os modelos de chat

2. **Otimizações**:
   - Cache de resultados de estruturação
   - Rate limiting para Gemini
   - Monitoramento de custos

3. **Documentação**:
   - Atualizar guias de uso
   - Documentar novos endpoints
   - Criar exemplos de uso

4. **Melhorias**:
   - Suporte a mais modelos
   - Configuração de parâmetros por modelo
   - Histórico de edições de markdown

## Notas Importantes

- A estruturação com Gemini é **opcional** - o sistema funciona sem ela
- O modelo padrão do chat continua sendo GPT-4o Mini
- A regeneração de chunks não afeta o template original
- O reprocessamento completo substitui todos os dados do documento
- O tema é persistido no localStorage do navegador

## Referências

- [Documentação do Google Gemini](https://ai.google.dev/docs)
- [AI SDK Documentation](https://ai-sdk.dev/docs)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- [Next Themes](https://github.com/pacocoursey/next-themes)

