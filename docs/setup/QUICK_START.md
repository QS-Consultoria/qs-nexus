# Guia Rápido de Início

## Pré-requisitos

1. **Node.js 18+**
2. **PostgreSQL com pgvector** (Neon recomendado)
3. **Conta OpenAI** com API key

## Instalação

```bash
npm install
```

## Configuração

1. Copie `.env.local.example` para `.env.local`
2. Configure as variáveis:
   ```env
   DATABASE_URL=postgresql://...
   OPENAI_API_KEY=sk-...
   DOCX_SOURCE_DIR=../list-docx
   ```

## Setup do Banco

### 1. Habilitar pgvector

Execute no Neon (via MCP ou SQL direto):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Executar Migrations

```bash
npm run db:migrate
```

## Pipeline Completo

```bash
# 1. Processar documentos (DOCX → Markdown)
npm run rag:process

# 2. Filtrar documentos
npm run rag:filter

# 3. Classificar documentos
npm run rag:classify

# 4. Gerar chunks
npm run rag:chunk

# 5. Gerar embeddings
npm run rag:embed

# 6. Armazenar no banco
npm run rag:store
```

## Utilitários

```bash
# Gerar relatório de status
npm run rag:status

# Reprocessar um arquivo específico
npm run rag:reprocess "../list-docx/01. Trabalhista/documento.docx"
```

## Verificação

### Verificar Status

```bash
npm run rag:status
```

Isso gera `processing-status.json` com:

- Total de arquivos
- Status de cada arquivo
- Progresso geral
- Arquivos rejeitados

### Verificar no Banco

```sql
-- Ver templates criados
SELECT COUNT(*) FROM templates;

-- Ver chunks com embeddings
SELECT COUNT(*) FROM template_chunks WHERE embedding IS NOT NULL;
```

## Troubleshooting

### Erro: "DATABASE_URL is not set"

- Verifique se `.env.local` existe e contém `DATABASE_URL`

### Erro: "vector type does not exist"

- Execute: `CREATE EXTENSION IF NOT EXISTS vector;` no Neon

### Erro: "Cannot find module"

- Execute `npm install` novamente

### Arquivo não processado

- Verifique o relatório de status: `npm run rag:status`
- Verifique se o arquivo está em `../list-docx`
- Verifique se o arquivo não foi rejeitado

### Reprocessar arquivo

```bash
npm run rag:reprocess "../list-docx/caminho/arquivo.docx"
```

## Próximos Passos

Após executar o pipeline:

1. **Verificar qualidade**: Use `npm run rag:status` para ver estatísticas
2. **Testar busca**: Use o banco para testar buscas vetoriais
3. **Integrar com agente**: Use os templates para o agente de IA

## Dicas

- **Incremental**: O sistema não reprocessa arquivos já processados
- **Rejeitados**: Arquivos rejeitados nunca são reprocessados (por design)
- **Caminhos**: Sempre use caminhos relativos ao root do projeto
- **Status**: Sempre verifique o status antes de reprocessar
