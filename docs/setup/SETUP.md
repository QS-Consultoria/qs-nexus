# Guia de Setup

## 1. Configuração do Neon

### Habilitar extensão pgvector

Use o MCP Neon ou execute diretamente no banco:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Via MCP Neon:**

1. Use o comando `mcp_Neon_run_sql` com o SQL acima
2. Certifique-se de que o `projectId` está correto

## 2. Configuração do .env.local

Crie o arquivo `.env.local` na raiz do projeto:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-...

# Google Generative AI (opcional, para estruturação de PDF e .doc)
# Obtenha sua chave em: https://ai.google.dev/
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key-here

# Configurações
DOCX_SOURCE_DIR=../list-docx
EMBEDDING_MODEL=text-embedding-3-small
BATCH_SIZE=64
CHUNK_MAX_TOKENS=800

# Processamento Paralelo
WORKER_CONCURRENCY=6          # Número de workers paralelos para process-documents (padrão: 6)
CLASSIFY_CONCURRENCY=3        # Número de workers paralelos para classify-documents (padrão: 3)
EMBED_CONCURRENCY=2           # Número de workers paralelos para generate-embeddings (padrão: 2)
FILTER_CONCURRENCY=10         # Número de workers paralelos para filter-documents (padrão: 10)
DB_MAX_CONNECTIONS=20         # Máximo de conexões do pool do banco (padrão: 20)
MAX_RETRIES=3                 # Tentativas de retry em caso de falha (padrão: 3)

# Filtros
MIN_WORDS=300
MAX_WORDS=25000
```

## 3. Instalação de Dependências

```bash
npm install
```

## 4. Executar Migrations

```bash
npm run db:migrate
```

Isso criará:

- Extensão pgvector
- Enums (file_status, doc_type, area, complexity)
- Tabelas (document_files, templates, template_chunks)
- Índices (incluindo HNSW para busca vetorial)

## 5. Verificar Setup

```bash
# Gerar relatório de status (deve estar vazio inicialmente)
npm run rag:status
```

## Próximos Passos

1. Coloque os arquivos DOCX em `../list-docx` (ou configure `DOCX_SOURCE_DIR`)
2. Execute o pipeline completo:
   ```bash
   npm run rag:process
   npm run rag:filter
   npm run rag:classify
   npm run rag:chunk
   npm run rag:embed
   npm run rag:store
   ```

## Troubleshooting

### Erro: "vector type does not exist"

- Certifique-se de que a extensão pgvector foi habilitada
- Execute: `CREATE EXTENSION IF NOT EXISTS vector;`

### Erro: "DATABASE_URL is not set"

- Verifique se o arquivo `.env.local` existe e contém `DATABASE_URL`

### Erro: "Cannot find module"

- Execute `npm install` novamente
- Verifique se todas as dependências estão instaladas
