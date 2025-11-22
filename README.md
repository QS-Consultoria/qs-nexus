# LegalWise RAG System

Sistema de RAG (Retrieval-Augmented Generation) para processamento de documentos jurídicos DOCX, conversão para Markdown, classificação com metadados estruturados e geração de embeddings.

## Pré-requisitos

- Node.js 18+
- PostgreSQL com extensão pgvector (Neon recomendado)
- Conta OpenAI com API key
- (Opcional) Conta Google AI com API key para estruturação melhorada de PDF e .doc

## Instalação

```bash
npm install
```

## Configuração

1. Copie `.env.local.example` para `.env.local`
2. Configure as variáveis de ambiente:
   - `DATABASE_URL`: String de conexão do Neon
   - `OPENAI_API_KEY`: Chave da API OpenAI
   - `GOOGLE_GENERATIVE_AI_API_KEY`: (Opcional) Chave da API Google para estruturação melhorada de PDF e .doc. Obtenha em [Google AI Studio](https://ai.google.dev/)
   - `DOCX_SOURCE_DIR`: Caminho relativo onde estão os arquivos DOCX (padrão: `./list-docx`)

## Setup do Banco de Dados

Para instruções detalhadas de setup, consulte [docs/SETUP.md](./docs/SETUP.md).

### Resumo Rápido:

1. **Habilitar pgvector no Neon:**

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Executar Migrations:**
   ```bash
   npm run db:migrate
   ```

Isso criará as tabelas:

- `document_files`: Tracking de arquivos processados
- `templates`: Documentos processados (TemplateDocument)
- `template_chunks`: Chunks com embeddings para RAG

## Uso

### Pipeline Completo

```bash
# 1. Processar documentos (DOCX → Markdown)
npm run rag:process

# 2. Filtrar documentos (validação de tamanho)
npm run rag:filter

# 3. Classificar documentos (gerar TemplateDocument)
npm run rag:classify

# 4. Gerar chunks
npm run rag:chunk

# 5. Gerar embeddings
npm run rag:embed

# 6. Armazenar no banco
npm run rag:store
```

### Utilitários

```bash
# Gerar relatório de status
npm run rag:status

# Reprocessar um arquivo específico
npm run rag:reprocess "./list-docx/01. Trabalhista/documento.docx"

# Investigar arquivos em processing
npm run rag:investigate

# Corrigir status de arquivos com template
npm run rag:fix-status

# Resetar arquivos sem markdown para pending
npm run rag:reset-missing

# Marcar arquivos no limbo como rejeitados
npm run rag:reject-failed
```

Para mais detalhes sobre troubleshooting e scripts utilitários, consulte [docs/guides/troubleshooting.md](./docs/guides/troubleshooting.md).

## Estrutura do Projeto

```
lw-rag-system/
├── lib/
│   ├── db/
│   │   ├── schema/          # Schema Drizzle
│   │   ├── migrations/       # Migrations SQL
│   │   └── index.ts         # Conexão com banco
│   ├── services/            # Serviços principais
│   │   ├── file-tracker.ts
│   │   ├── docx-converter.ts
│   │   ├── classifier.ts
│   │   ├── chunker.ts
│   │   ├── embedding-generator.ts
│   │   └── store-embeddings.ts
│   └── types/
│       └── template-document.ts
├── scripts/                 # Scripts do pipeline
└── .env.local              # Configurações (não versionado)
```

## Características

- ✅ Tracking de processamento (evita duplicatas)
- ✅ Caminhos relativos (portável entre máquinas)
- ✅ Conversão DOCX → Markdown (usando mammoth)
- ✅ Conversão PDF e .doc → Markdown estruturado (com Google Gemini 2.0 Flash quando disponível)
- ✅ Classificação inteligente com metadados
- ✅ Chunking por seções Markdown
- ✅ Embeddings com text-embedding-3-small
- ✅ Índice HNSW para busca vetorial otimizada
- ✅ Relatórios de status
- ✅ Reprocessamento de arquivos individuais

### Processamento de Documentos

O sistema suporta três formatos de documentos:

- **DOCX**: Convertido usando `mammoth`, gerando markdown bem estruturado automaticamente
- **PDF**: Extração de texto com `pdf-parse` e estruturação com Google Gemini 2.0 Flash (quando `GOOGLE_GENERATIVE_AI_API_KEY` está configurada)
- **DOC**: Extração com `textract`/LibreOffice/Pandoc e estruturação com Google Gemini 2.0 Flash (quando `GOOGLE_GENERATIVE_AI_API_KEY` está configurada)

Se a chave do Google não estiver configurada, o sistema usa formatação básica como fallback.

## Documentação

Toda a documentação está na pasta [`docs/`](./docs/):

- [docs/INDEX.md](./docs/INDEX.md) - Índice da documentação
- [docs/QUICK_START.md](./docs/QUICK_START.md) - Guia rápido de início
- [docs/SETUP.md](./docs/SETUP.md) - Guia completo de configuração
- [docs/README.md](./docs/README.md) - Visão geral do sistema
- [docs/ARQUITETURA.md](./docs/ARQUITETURA.md) - Arquitetura detalhada
- [docs/DADOS.md](./docs/DADOS.md) - Estrutura de dados
- [docs/IMPLEMENTATION_SUMMARY.md](./docs/IMPLEMENTATION_SUMMARY.md) - Resumo da implementação

## Notas

- Arquivos rejeitados nunca são reprocessados
- Caminhos são sempre relativos ao root do projeto
- Relatório de status é gerado em `processing-status.json`
