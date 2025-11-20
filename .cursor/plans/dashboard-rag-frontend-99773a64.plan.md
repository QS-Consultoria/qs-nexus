<!-- 99773a64-abf9-4bc0-8e8c-6a72e5017967 a7614043-42cc-4ac9-9181-90ce803ce5f2 -->
# Dashboard RAG Frontend - Plano de Implementação

## Visão Geral

Criar um dashboard web completo em Next.js para gerenciar e visualizar o sistema RAG de documentos jurídicos. O dashboard incluirá autenticação, relatórios, upload de arquivos, processamento e interface de chat para testar o RAG.

## Estrutura do Projeto

### Decisões de Arquitetura

- **Framework**: Next.js 14+ (App Router)
- **Autenticação**: NextAuth.js com credenciais (email/senha)
- **Banco de Dados**: Reutilizar Neon PostgreSQL existente + nova tabela `users`
- **UI**: Tailwind CSS + shadcn/ui (componentes reutilizáveis)
- **API**: Next.js API Routes (App Router)
- **Upload**: Multipart/form-data com suporte a múltiplos arquivos e pastas

## Fase 1: Setup do Projeto Next.js

### 1.1. Inicialização do Projeto

- [ ] Criar novo projeto Next.js na pasta `dashboard/` ou `frontend/`
- [ ] Configurar TypeScript
- [ ] Instalar dependências base: `next`, `react`, `react-dom`
- [ ] Configurar Tailwind CSS
- [ ] Instalar shadcn/ui e componentes base

### 1.2. Configuração de Ambiente

- [ ] Criar `.env.local` com variáveis:
  - `DATABASE_URL` (reutilizar do projeto RAG)
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `OPENAI_API_KEY` (para chat RAG)
- [ ] Configurar conexão com banco de dados (Drizzle ORM)

### 1.3. Estrutura de Pastas

```
dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── upload/
│   │   ├── files/
│   │   ├── files/[id]/
│   │   └── chat/
│   ├── api/
│   │   ├── auth/
│   │   ├── documents/
│   │   ├── upload/
│   │   ├── process/
│   │   └── chat/
│   └── layout.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── dashboard/
│   ├── upload/
│   └── chat/
├── lib/
│   ├── db/
│   ├── auth/
│   ├── services/
│   └── utils/
└── types/
```

## Fase 2: Autenticação

### 2.1. Schema de Usuários

- [ ] Criar migration para tabela `users`:
  - `id` (UUID)
  - `email` (unique)
  - `password` (hashed)
  - `name`
  - `createdAt`, `updatedAt`
- [ ] Adicionar schema Drizzle em `lib/db/schema/users.ts`

### 2.2. NextAuth.js Setup

- [ ] Instalar `next-auth` e `@auth/drizzle-adapter`
- [ ] Criar `lib/auth/config.ts` com configuração NextAuth
- [ ] Configurar provider de credenciais
- [ ] Criar API route `app/api/auth/[...nextauth]/route.ts`
- [ ] Criar middleware para proteger rotas

### 2.3. Páginas de Autenticação

- [ ] Criar `app/(auth)/login/page.tsx`:
  - Formulário de login
  - Validação com Zod
  - Redirecionamento após login
- [ ] Criar `app/(auth)/register/page.tsx`:
  - Formulário de registro
  - Hash de senha (bcrypt)
  - Validação de email único

## Fase 3: Dashboard Principal (Relatórios)

### 3.1. API de Estatísticas

- [ ] Criar `app/api/documents/stats/route.ts`:
  - Endpoint GET que retorna:
    - Total de documentos
    - Por status (pending, processing, completed, failed, rejected)
    - Por área jurídica
    - Por tipo de documento
    - Progresso geral (%)
    - Documentos GOLD/SILVER
- [ ] Reutilizar lógica de `scripts/generate-status-report.ts`

### 3.2. Componentes de Dashboard

- [ ] Criar `components/dashboard/StatsCards.tsx`:
  - Cards com métricas principais
  - Ícones e cores por status
- [ ] Criar `components/dashboard/StatusChart.tsx`:
  - Gráfico de pizza/barra com distribuição de status
  - Usar recharts ou similar
- [ ] Criar `components/dashboard/AreaChart.tsx`:
  - Gráfico de distribuição por área jurídica
- [ ] Criar `components/dashboard/RecentFiles.tsx`:
  - Lista dos últimos arquivos processados
  - Link para detalhes

### 3.3. Página do Dashboard

- [ ] Criar `app/(dashboard)/dashboard/page.tsx`:
  - Layout com sidebar/navbar
  - Grid de componentes de estatísticas
  - Atualização em tempo real (opcional: polling ou SSE)

## Fase 4: Upload de Arquivos

### 4.1. Componente de Upload

- [ ] Criar `components/upload/FileUpload.tsx`:
  - Drag & drop de arquivos
  - Seleção múltipla de arquivos
  - Botão para escolher pasta (`<input webkitdirectory>`)
  - Preview de arquivos selecionados
  - Validação (apenas .docx)
  - Barra de progresso

### 4.2. API de Upload

- [ ] Criar `app/api/upload/route.ts`:
  - POST endpoint para receber arquivos
  - Salvar arquivos temporariamente em `uploads/temp/`
  - Validar formato (.docx)
  - Retornar lista de arquivos recebidos
- [ ] Implementar upload multipart/form-data
- [ ] Limitar tamanho de arquivo (ex: 50MB por arquivo)

### 4.3. API de Processamento

- [ ] Criar `app/api/process/route.ts`:
  - POST endpoint que recebe lista de arquivos
  - Para cada arquivo:
    - Copiar para diretório de processamento
    - Chamar pipeline RAG (ouchestrar scripts)
  - Retornar job ID para tracking
- [ ] Integrar com serviços existentes:
  - `lib/services/file-tracker.ts`
  - `lib/services/docx-converter.ts`
  - Pipeline completo (process → filter → classify → chunk → embed → store)

### 4.4. Página de Upload

- [ ] Criar `app/(dashboard)/upload/page.tsx`:
  - Componente FileUpload
  - Botão "Processar Arquivos"
  - Lista de jobs em processamento
  - Status em tempo real (WebSocket ou polling)

## Fase 5: Lista e Detalhes de Arquivos

### 5.1. API de Listagem

- [ ] Criar `app/api/documents/route.ts`:
  - GET: Lista paginada de documentos
  - Query params: `page`, `limit`, `status`, `area`, `docType`
  - Retornar: `document_files` + join com `templates`
- [ ] Criar `app/api/documents/[id]/route.ts`:
  - GET: Detalhes completos de um documento
  - Incluir: status, metadados, chunks, template completo

### 5.2. Componentes de Lista

- [ ] Criar `components/files/FileList.tsx`:
  - Tabela com colunas: nome, status, área, tipo, data
  - Filtros por status/área/tipo
  - Paginação
  - Link para detalhes
- [ ] Criar `components/files/FileCard.tsx`:
  - Card para visualização em grid (alternativa)

### 5.3. Página de Lista

- [ ] Criar `app/(dashboard)/files/page.tsx`:
  - Componente FileList
  - Filtros e busca
  - Ordenação

### 5.4. Página de Detalhes

- [ ] Criar `app/(dashboard)/files/[id]/page.tsx`:
  - Informações do arquivo (status, hash, palavras)
  - Metadados do template (se processado)
  - Preview do markdown
  - Lista de chunks (se disponível)
  - Botão "Reprocessar" (se falhou)

## Fase 6: Chat RAG

### 6.1. Serviço de Busca RAG

- [ ] Criar `lib/services/rag-search.ts`:
  - Função `searchSimilarChunks(query: string, limit: number)`:
    - Gerar embedding da query usando `generateEmbeddings`
    - Buscar chunks similares no banco (cosine similarity)
    - Query SQL: `SELECT ... ORDER BY embedding <=> $1 LIMIT $2`
    - Retornar chunks com similaridade e contexto
- [ ] Criar `lib/services/rag-chat.ts`:
  - Função `chatWithRAG(message: string, history: Message[])`:
    - Buscar chunks relevantes
    - Construir contexto para prompt
    - Chamar OpenAI (GPT-4 ou similar) com contexto RAG
    - Retornar resposta

### 6.2. API de Chat

- [ ] Criar `app/api/chat/route.ts`:
  - POST endpoint para mensagens
  - Usar AI SDK (`ai` package)
  - Integrar com `rag-chat.ts`
  - Streaming de resposta (opcional)

### 6.3. Componente de Chat

- [ ] Criar `components/chat/ChatInterface.tsx`:
  - Interface similar ao AI SDK
  - Input de mensagem
  - Histórico de conversa
  - Indicador de digitação
  - Botão de limpar

### 6.4. Página de Chat

- [ ] Criar `app/(dashboard)/chat/page.tsx`:
  - Componente ChatInterface
  - Layout responsivo
  - Instruções de uso

## Fase 7: Layout e Navegação

### 7.1. Layout Principal

- [ ] Criar `app/(dashboard)/layout.tsx`:
  - Sidebar com navegação
  - Navbar com user menu
  - Proteção de rotas (middleware)
- [ ] Criar `components/layout/Sidebar.tsx`:
  - Links: Dashboard, Upload, Arquivos, Chat
  - Ícones
- [ ] Criar `components/layout/Navbar.tsx`:
  - Logo/título
  - UserButton (logout)
  - Notificações (opcional)

### 7.2. Responsividade

- [ ] Mobile-first design
- [ ] Sidebar colapsável em mobile
- [ ] Tabelas responsivas

## Fase 8: Melhorias e Polimento

### 8.1. Tratamento de Erros

- [ ] Error boundaries
- [ ] Mensagens de erro amigáveis
- [ ] Logging de erros

### 8.2. Performance

- [ ] Loading states (skeletons)
- [ ] Otimização de queries (índices)
- [ ] Cache de estatísticas (revalidate)

### 8.3. UX

- [ ] Toasts/notificações (react-hot-toast)
- [ ] Confirmações para ações destrutivas
- [ ] Tooltips e ajuda contextual

### 8.4. Testes (Opcional)

- [ ] Testes de componentes críticos
- [ ] Testes de API

## Dependências Principais (Adicionar ao package.json existente)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "next-auth": "^5.0.0",
    "@auth/drizzle-adapter": "^1.0.0",
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.6",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "recharts": "^2.10.0",
    "react-hot-toast": "^2.4.0",
    "lucide-react": "^0.294.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  }
}
```

**Nota**: `ai`, `@ai-sdk/openai`, `drizzle-orm`, `postgres`, `zod` já existem no projeto.

## Arquivos Principais a Criar/Modificar

### Novos Arquivos

- `dashboard/app/(auth)/login/page.tsx`
- `dashboard/app/(auth)/register/page.tsx`
- `dashboard/app/(dashboard)/dashboard/page.tsx`
- `dashboard/app/(dashboard)/upload/page.tsx`
- `dashboard/app/(dashboard)/files/page.tsx`
- `dashboard/app/(dashboard)/files/[id]/page.tsx`
- `dashboard/app/(dashboard)/chat/page.tsx`
- `dashboard/app/api/auth/[...nextauth]/route.ts`
- `dashboard/app/api/documents/stats/route.ts`
- `dashboard/app/api/documents/route.ts`
- `dashboard/app/api/documents/[id]/route.ts`
- `dashboard/app/api/upload/route.ts`
- `dashboard/app/api/process/route.ts`
- `dashboard/app/api/chat/route.ts`
- `dashboard/lib/services/rag-search.ts`
- `dashboard/lib/services/rag-chat.ts`
- `dashboard/lib/db/schema/users.ts`
- `dashboard/lib/auth/config.ts`

### Arquivos a Reutilizar (do projeto RAG)

- `lib/services/file-tracker.ts`
- `lib/services/docx-converter.ts`
- `lib/services/classifier.ts`
- `lib/services/chunker.ts`
- `lib/services/embedding-generator.ts`
- `lib/services/store-embeddings.ts`
- `lib/db/schema/rag.ts`
- `lib/db/index.ts`

## Notas de Implementação

1. **Upload de Pasta**: Usar `<input type="file" webkitdirectory multiple />` - limitação do navegador, mas funcional
2. **Processamento Assíncrono**: Considerar fila de jobs (Bull/BullMQ) para processamento pesado (futuro)
3. **Feedback de Progresso**: 

   - Polling a cada 2-3 segundos quando job ativo
   - Usar shadcn Progress para barras de progresso
   - Badges coloridos por status (pending, processing, completed, failed)
   - Animações suaves com Tailwind transitions

4. **Streaming**: Chat pode usar streaming do AI SDK para melhor UX
5. **Segurança**: Validar todos os inputs, sanitizar uploads, rate limiting
6. **Performance**: Paginação obrigatória para listas grandes, lazy loading de componentes pesados
7. **shadcn/ui**: Todos os componentes devem usar shadcn para consistência visual
8. **Tailwind**: Usar classes utilitárias do Tailwind, evitar CSS customizado quando possível
9. **Design System**: Seguir padrões do shadcn (cores, espaçamentos, tipografia)