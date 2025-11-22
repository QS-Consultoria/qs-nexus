# Referência de APIs do Dashboard

Esta documentação fornece referência completa de todas as APIs do Dashboard RAG, incluindo endpoints, parâmetros, respostas e exemplos.

## Índice

1. [Autenticação](#autenticação)
2. [Documentos](#documentos)
3. [Upload e Processamento](#upload-e-processamento)
4. [Chat RAG](#chat-rag)
5. [Códigos de Erro](#códigos-de-erro)

## Autenticação

### POST /api/auth/register

Registra um novo usuário no sistema.

**Endpoint:** `POST /api/auth/register`

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

**Campos:**

- `email` (string, obrigatório): Email único do usuário
- `password` (string, obrigatório): Senha do usuário (será hasheada)
- `name` (string, obrigatório): Nome completo do usuário

**Response 200:**

```json
{
  "message": "Usuário criado com sucesso",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response 400:**

```json
{
  "error": "Email já existe"
}
```

**Response 500:**

```json
{
  "error": "Erro ao criar usuário"
}
```

**Exemplo:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "senha123",
    "name": "João Silva"
  }'
```

### POST /api/auth/[...nextauth]

Handler do NextAuth para autenticação. Gerencia login, logout e sessões.

**Endpoint:** `POST /api/auth/[...nextauth]`

**Nota**: Este endpoint é gerenciado pelo NextAuth.js. Para uso programático, use as funções `signIn` e `signOut` do NextAuth.

**Login:**

- Use `signIn("credentials", { email, password })` no cliente
- Ou faça POST para `/api/auth/signin/credentials` com credenciais

**Logout:**

- Use `signOut()` no cliente
- Ou faça POST para `/api/auth/signout`

## Documentos

### GET /api/documents/stats

Retorna estatísticas gerais do sistema.

**Endpoint:** `GET /api/documents/stats`

**Cache:** 30 segundos (`revalidate = 30`)

**Response 200:**

```json
{
  "summary": {
    "total": 100,
    "pending": 10,
    "processing": 5,
    "completed": 80,
    "failed": 3,
    "rejected": 2,
    "progress": 80
  },
  "byArea": [
    {
      "area": "Direito Civil",
      "count": 30
    },
    {
      "area": "Direito Trabalhista",
      "count": 25
    }
  ],
  "byDocType": [
    {
      "docType": "Contrato",
      "count": 40
    },
    {
      "docType": "Petição",
      "count": 35
    }
  ],
  "gold": 50,
  "silver": 30,
  "recentFiles": [
    {
      "id": "uuid",
      "fileName": "documento.docx",
      "status": "completed",
      "wordsCount": 5000,
      "processedAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/documents/model-stats

Retorna estatísticas de modelos e tokens usados na classificação.

**Endpoint:** `GET /api/documents/model-stats`

**Cache:** 30 segundos (`revalidate = 30`)

**Response 200:**

```json
{
  "byProvider": [
    {
      "provider": "openai",
      "count": 1500
    },
    {
      "provider": "google",
      "count": 865
    }
  ],
  "byModel": [
    {
      "model": "gpt-4o",
      "provider": "openai",
      "count": 1200
    },
    {
      "model": "gemini-2.0-flash-exp",
      "provider": "google",
      "count": 865
    }
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
    },
    {
      "model": "gemini-2.0-flash-exp",
      "provider": "google",
      "input": 3000000,
      "output": 100000,
      "total": 3100000
    }
  ]
}
```

**Campos:**

- `byProvider`: Array de estatísticas por provider (openai, google)
- `byModel`: Array de estatísticas por modelo (ordenado por count DESC)
- `totalTokens`: Total de tokens usados (input, output, total)
- `tokensByProvider`: Tokens agregados por provider
- `tokensByModel`: Tokens agregados por modelo (ordenado por total DESC)

**Exemplo:**

```bash
curl http://localhost:3000/api/documents/model-stats
```

**Campos:**

- `summary`: Estatísticas gerais por status
- `byArea`: Distribuição por área jurídica
- `byDocType`: Distribuição por tipo de documento
- `gold`: Número de documentos GOLD
- `silver`: Número de documentos SILVER
- `recentFiles`: Últimos 10 arquivos processados

**Response 500:**

```json
{
  "error": "Erro ao buscar estatísticas"
}
```

**Exemplo:**

```bash
curl http://localhost:3000/api/documents/stats
```

### GET /api/documents

Lista documentos com paginação e filtros.

**Endpoint:** `GET /api/documents`

**Query Parameters:**

- `page` (number, opcional): Número da página (padrão: 1)
- `limit` (number, opcional): Itens por página (padrão: 20)
- `status` (string, opcional): Filtrar por status (`pending`, `processing`, `completed`, `failed`, `rejected`)
- `area` (string, opcional): Filtrar por área jurídica
- `docType` (string, opcional): Filtrar por tipo de documento

**Cache:** 10 segundos (`revalidate = 10`)

**Response 200:**

```json
{
  "files": [
    {
      "id": "uuid",
      "fileName": "documento.docx",
      "filePath": "/path/to/file",
      "status": "completed",
      "wordsCount": 5000,
      "processedAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "templateId": "uuid" | null,
      "templateTitle": "Título do Documento" | null,
      "templateArea": "Direito Civil" | null,
      "templateDocType": "Contrato" | null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Exemplo:**

```bash
# Listar primeira página
curl http://localhost:3000/api/documents?page=1&limit=20

# Filtrar por status
curl http://localhost:3000/api/documents?status=completed

# Filtrar por área e tipo
curl "http://localhost:3000/api/documents?area=Direito%20Civil&docType=Contrato"
```

### GET /api/documents/[id]

Retorna detalhes completos de um documento.

**Endpoint:** `GET /api/documents/[id]`

**Path Parameters:**

- `id` (string, obrigatório): ID do documento (UUID)

**Cache:** 60 segundos (`revalidate = 60`)

**Response 200:**

```json
{
  "file": {
    "id": "uuid",
    "fileName": "documento.docx",
    "filePath": "/path/to/file",
    "fileHash": "sha256-hash",
    "status": "completed",
    "wordsCount": 5000,
    "processedAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "template": {
    "id": "uuid",
    "documentFileId": "uuid",
    "title": "Título do Documento",
    "area": "Direito Civil",
    "docType": "Contrato",
    "isGold": true,
    "isSilver": false,
    "summary": "Resumo do documento...",
    "createdAt": "2024-01-01T00:00:00Z"
  } | null,
  "chunks": [
    {
      "id": "uuid",
      "templateId": "uuid",
      "chunkIndex": 0,
      "contentMarkdown": "Conteúdo do chunk...",
      "section": "Seção 1" | null,
      "role": "Cláusula" | null,
      "embedding": null,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Response 404:**

```json
{
  "error": "Arquivo não encontrado"
}
```

**Exemplo:**

```bash
curl http://localhost:3000/api/documents/550e8400-e29b-41d4-a716-446655440000
```

## Upload e Processamento

### POST /api/upload

Recebe arquivos via multipart/form-data.

**Endpoint:** `POST /api/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**

- `files` (File[], obrigatório): Array de arquivos `.docx`

**Validações:**

- Apenas arquivos `.docx` são aceitos
- Tamanho máximo: 50MB por arquivo
- Arquivos inválidos são ignorados silenciosamente

**Response 200:**

```json
{
  "message": "2 arquivo(s) enviado(s) com sucesso",
  "files": [
    {
      "name": "documento1.docx",
      "size": 1024000,
      "path": "/uploads/temp/documento1.docx"
    },
    {
      "name": "documento2.docx",
      "size": 2048000,
      "path": "/uploads/temp/documento2.docx"
    }
  ]
}
```

**Response 400:**

```json
{
  "error": "Nenhum arquivo enviado"
}
```

**Response 500:**

```json
{
  "error": "Erro ao fazer upload dos arquivos"
}
```

**Exemplo:**

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "files=@documento1.docx" \
  -F "files=@documento2.docx"
```

**Nota**: Em JavaScript, use `FormData`:

```javascript
const formData = new FormData()
formData.append('files', file1)
formData.append('files', file2)

fetch('/api/upload', {
  method: 'POST',
  body: formData,
})
```

### POST /api/process

Inicia processamento de arquivos enviados.

**Endpoint:** `POST /api/process`

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "files": [
    {
      "name": "documento1.docx",
      "path": "/uploads/temp/documento1.docx"
    },
    {
      "name": "documento2.docx",
      "path": "/uploads/temp/documento2.docx"
    }
  ]
}
```

**Campos:**

- `files` (array, obrigatório): Array de objetos com `name` e `path`

**Response 200:**

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "2 arquivo(s) iniciado(s) para processamento",
  "files": [
    {
      "name": "documento1.docx",
      "path": "/data/process/documento1.docx"
    },
    {
      "name": "documento2.docx",
      "path": "/data/process/documento2.docx"
    }
  ]
}
```

**Response 400:**

```json
{
  "error": "Nenhum arquivo para processar"
}
```

**Response 500:**

```json
{
  "error": "Erro ao iniciar processamento"
}
```

**Exemplo:**

```bash
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "name": "documento1.docx",
        "path": "/uploads/temp/documento1.docx"
      }
    ]
  }'
```

**Nota**: Atualmente, a API apenas marca os arquivos como "processing" e copia para o diretório de processamento. A integração completa com o pipeline RAG está pendente.

### GET /api/process/[jobId]/stream

Server-Sent Events (SSE) para acompanhar progresso do processamento.

**Endpoint:** `GET /api/process/[jobId]/stream`

**Path Parameters:**

- `jobId` (string, obrigatório): ID do job de processamento (UUID)

**Headers:**

```
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Response:** Stream de eventos SSE

**Eventos:**

1. **progress**

```json
{
  "type": "progress",
  "data": {
    "progress": 50,
    "message": "Processando... 50%",
    "jobId": "uuid"
  }
}
```

2. **job-complete**

```json
{
  "type": "job-complete",
  "data": {
    "jobId": "uuid",
    "message": "Processamento concluído"
  }
}
```

**Exemplo (JavaScript):**

```javascript
const eventSource = new EventSource(`/api/process/${jobId}/stream`)

eventSource.addEventListener('progress', event => {
  const data = JSON.parse(event.data)
  console.log(`Progresso: ${data.data.progress}%`)
})

eventSource.addEventListener('job-complete', event => {
  const data = JSON.parse(event.data)
  console.log('Processamento concluído!')
  eventSource.close()
})
```

**Nota**: Atualmente implementado com simulação. Precisa ser conectado ao sistema de processamento real.

## Documentos - Operações Avançadas

### PUT /api/documents/[id]

Atualiza o markdown de um documento.

**Endpoint:** `PUT /api/documents/[id]`

**Path Parameters:**

- `id` (string, obrigatório): ID do documento (UUID)

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "markdown": "# Título\n\nConteúdo do documento..."
}
```

**Campos:**

- `markdown` (string, obrigatório): Novo conteúdo markdown

**Response 200:**

```json
{
  "success": true,
  "message": "Markdown atualizado com sucesso"
}
```

**Response 400:**

```json
{
  "error": "Markdown é obrigatório"
}
```

**Response 404:**

```json
{
  "error": "Arquivo não encontrado"
}
```

**Exemplo:**

```bash
curl -X PUT http://localhost:3000/api/documents/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Novo Título\n\nNovo conteúdo..."
  }'
```

### POST /api/documents/[id]/reprocess-full

Reprocessa completamente um documento com um novo arquivo.

**Endpoint:** `POST /api/documents/[id]/reprocess-full`

**Path Parameters:**

- `id` (string, obrigatório): ID do documento (UUID)

**Content-Type:** `multipart/form-data`

**Form Data:**

- `file` (File, obrigatório): Novo arquivo DOCX, DOC ou PDF

**Validações:**

- Apenas arquivos `.docx`, `.doc` ou `.pdf` são aceitos
- Tamanho máximo: 50MB
- Arquivo deve estar em status `completed` ou `rejected`

**Response 200:**

```json
{
  "success": true,
  "message": "Reprocessamento completo iniciado. O arquivo será processado em segundo plano."
}
```

**Response 400:**

```json
{
  "error": "Apenas arquivos concluídos ou rejeitados podem ser reprocessados"
}
```

**Response 404:**

```json
{
  "error": "Arquivo não encontrado"
}
```

**Exemplo:**

```bash
curl -X POST http://localhost:3000/api/documents/550e8400-e29b-41d4-a716-446655440000/reprocess-full \
  -F "file=@novo-documento.docx"
```

**Nota**: O reprocessamento é assíncrono. O arquivo será processado em segundo plano.

### POST /api/documents/[id]/regenerate-chunks

Regenera chunks e embeddings de um documento sem reprocessar o documento completo.

**Endpoint:** `POST /api/documents/[id]/regenerate-chunks`

**Path Parameters:**

- `id` (string, obrigatório): ID do documento (UUID)

**Response 200:**

```json
{
  "success": true,
  "message": "Chunks e embeddings regenerados com sucesso. 15 chunks criados.",
  "chunksCount": 15
}
```

**Response 400:**

```json
{
  "error": "Apenas arquivos concluídos podem ter chunks regenerados"
}
```

**Response 404:**

```json
{
  "error": "Arquivo não encontrado"
}
```

**Exemplo:**

```bash
curl -X POST http://localhost:3000/api/documents/550e8400-e29b-41d4-a716-446655440000/regenerate-chunks
```

**Nota**: Esta operação:
1. Deleta chunks e embeddings antigos
2. Gera novos chunks a partir do markdown atual
3. Gera novos embeddings para os chunks
4. Armazena os novos chunks no banco de dados

### DELETE /api/documents/[id]

Exclui um documento e todos os dados relacionados (template, chunks).

**Endpoint:** `DELETE /api/documents/[id]`

**Path Parameters:**

- `id` (string, obrigatório): ID do documento (UUID)

**Response 200:**

```json
{
  "success": true,
  "message": "Arquivo e todos os dados relacionados foram excluídos com sucesso"
}
```

**Response 404:**

```json
{
  "error": "Arquivo não encontrado"
}
```

**Exemplo:**

```bash
curl -X DELETE http://localhost:3000/api/documents/550e8400-e29b-41d4-a716-446655440000
```

**Nota**: Esta operação exclui em cascata:
- O arquivo (`document_files`)
- O template associado (`templates`)
- Todos os chunks (`template_chunks`)

## Chat RAG

### POST /api/chat

Chat com RAG usando busca vetorial e múltiplos modelos de IA (OpenAI e Google Gemini).

**Endpoint:** `POST /api/chat`

**Autenticação:** Requerida (sessão NextAuth)

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "message": "Qual é a lei sobre contratos de trabalho?",
  "model": "openai-gpt-4o-mini",
  "history": [
    {
      "role": "user",
      "content": "Olá"
    },
    {
      "role": "assistant",
      "content": "Olá! Como posso ajudar?"
    }
  ]
}
```

**Campos:**

- `message` (string, obrigatório): Mensagem do usuário
- `model` (string, opcional): Modelo de IA a usar (padrão: `openai-gpt-4o-mini`)
- `history` (array, opcional): Histórico de mensagens (últimas 6 são usadas)

**Modelos Disponíveis:**

- `openai-gpt-4o-mini` (padrão)
- `openai-gpt-4o`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

**Formato Alternativo (AI SDK):**

Também aceita o formato do AI SDK:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Qual é a lei sobre contratos?"
    }
  ],
  "model": "openai-gpt-4o-mini"
}
```

**Response:** Stream de texto (via AI SDK Data Stream)

**Formato do Stream:**
O stream segue o formato do AI SDK:

- Cada chunk contém parte da resposta
- O stream termina quando a resposta está completa

**Exemplo (JavaScript com AI SDK):**

```javascript
import { useChat } from 'ai/react'

const { messages, input, handleInputChange, handleSubmit } = useChat({
  api: '/api/chat',
})
```

**Exemplo (fetch manual):**

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Qual é a lei sobre contratos?',
    history: [],
  }),
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  // Processar chunk
}
```

**Response 401:**

```json
{
  "error": "Não autenticado"
}
```

**Response 400:**

```json
{
  "error": "Mensagem é obrigatória"
}
```

**Response 500:**

```json
{
  "error": "Erro ao processar mensagem"
}
```

**Fluxo Interno:**

1. Gera embedding da query usando `generateEmbedding`
2. Busca chunks similares no banco (cosine similarity >= 0.5)
3. Constrói contexto RAG com chunks encontrados
4. Chama o modelo selecionado (OpenAI ou Google Gemini) com contexto
5. Retorna resposta via streaming

**Parâmetros da Busca:**

- `limit`: 10 chunks (padrão)
- `minSimilarity`: 0.5 (50%) - reduzido de 0.7 para encontrar mais resultados
- Histórico: Últimas 6 mensagens (3 turnos)

**Configuração de Modelos:**

- **OpenAI**: Requer `OPENAI_API_KEY` no `.env.local`
- **Google Gemini**: Requer `GOOGLE_GENERATIVE_AI_API_KEY` no `.env.local`

## Códigos de Erro

### Códigos HTTP

- **200 OK**: Requisição bem-sucedida
- **400 Bad Request**: Dados inválidos ou faltando
- **401 Unauthorized**: Não autenticado
- **404 Not Found**: Recurso não encontrado
- **500 Internal Server Error**: Erro no servidor

### Mensagens de Erro Comuns

#### Autenticação

- `"Email já existe"`: Email já cadastrado no sistema
- `"Não autenticado"`: Sessão inválida ou expirada
- `"Credenciais inválidas"`: Email ou senha incorretos

#### Upload

- `"Nenhum arquivo enviado"`: Nenhum arquivo no request
- `"Erro ao fazer upload dos arquivos"`: Erro ao salvar arquivos

#### Processamento

- `"Nenhum arquivo para processar"`: Array de arquivos vazio
- `"Erro ao iniciar processamento"`: Erro ao copiar arquivos ou marcar como processing

#### Documentos

- `"Arquivo não encontrado"`: ID do documento não existe
- `"Erro ao buscar estatísticas"`: Erro na query do banco
- `"Erro ao buscar documentos"`: Erro na query do banco

#### Chat

- `"Mensagem é obrigatória"`: Campo `message` faltando ou vazio
- `"Erro ao processar mensagem"`: Erro na busca RAG ou OpenAI

## Rate Limiting

Atualmente, não há rate limiting implementado. Recomenda-se implementar para produção.

## Autenticação

A maioria das APIs requer autenticação via NextAuth. Exceções:

- `POST /api/auth/register` - Público
- `POST /api/auth/[...nextauth]` - Público (gerenciado pelo NextAuth)

Para APIs protegidas, inclua o cookie de sessão do NextAuth nas requisições.

## Cache

Algumas APIs usam cache via `revalidate`:

- `/api/documents/stats`: 30 segundos
- `/api/documents`: 10 segundos
- `/api/documents/[id]`: 60 segundos

## Versionamento

Atualmente não há versionamento de API. Todas as APIs estão em `/api/`.

## Referências

- [Arquitetura do Dashboard](../architecture/DASHBOARD.md)
- [Guia de Uso](../guides/dashboard.md)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [AI SDK Documentation](https://ai-sdk.dev/)
