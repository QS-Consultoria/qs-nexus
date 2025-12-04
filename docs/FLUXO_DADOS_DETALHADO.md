# 📊 Fluxo de Dados Detalhado - Sistema RAG

**Atualizado:** 04/12/2025  
**Versão:** 2.0  
**Público:** Desenvolvedores e Administradores

---

## 🎯 Visão Geral

Este documento descreve em detalhes técnicos o fluxo completo de processamento de dados no sistema, desde o upload até a disponibilização para busca semântica. Use este guia para entender a arquitetura, diagnosticar problemas e fazer manutenções.

---

## 📋 Sumário

1. [Arquitetura Geral](#arquitetura-geral)
2. [Fluxo Passo a Passo](#fluxo-passo-a-passo)
3. [Tabelas do Banco de Dados](#tabelas-do-banco-de-dados)
4. [Schemas e Templates](#schemas-e-templates)
5. [Como Intervir e Debugar](#como-intervir-e-debugar)
6. [Exemplos Práticos](#exemplos-práticos)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitetura Geral

### Componentes Principais

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Routes    │
│   (Next.js)     │
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
    │ Upload │    │  RAG   │    │   AI   │    │Storage │
    │Service │    │Processor│    │Service │    │Service │
    └────────┘    └────────┘    └────────┘    └────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │   NeonDB      │
                        │  (PostgreSQL  │
                        │  + pgvector)  │
                        └───────────────┘
```

### Tecnologias

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes, TypeScript
- **Banco de Dados**: NeonDB (PostgreSQL 16 + pgvector)
- **IA**: OpenAI (GPT-4, text-embedding-3-small)
- **ORM**: Drizzle ORM
- **Storage**: Sistema de arquivos local (`public/uploads`)

---

## 🔄 Fluxo Passo a Passo

### Etapa 1: Upload do Arquivo

**Endpoint:** `POST /api/documents/upload`

**Processo:**
1. Usuário seleciona arquivo(s) na interface
2. Validação client-side (tipo, tamanho)
3. Arquivo enviado via `FormData`
4. Servidor recebe e valida
5. Calcula hash SHA-256 do conteúdo
6. Cria diretórios: `public/uploads/{org}/{year}/{month}/`
7. Salva arquivo: `{hash}-{filename}`
8. Cria registro na tabela `documents` com status `pending`

**Código Relevante:**
```typescript
// app/api/documents/upload/route.ts
const hash = await calculateFileHash(file)
const uploadPath = getUploadPath(organizationId, file.name, hash)
await writeFile(fullPath, buffer)

const [doc] = await db.insert(documents).values({
  organizationId,
  uploadedBy: session.user.id,
  fileName,
  filePath: uploadPath,
  fileHash: hash,
  status: 'pending',
}).returning()
```

**Tabelas Afetadas:** `documents`

---

### Etapa 2: Conversão para Markdown

**Função:** `convertDocument()` em `lib/services/document-converter.ts`

**Processo:**
1. Detecta tipo do arquivo (PDF, DOCX, DOC, TXT)
2. Aplica conversor apropriado:
   - **DOCX**: `mammoth` (preserva estrutura)
   - **PDF**: `pdf-parse` (extração nativa) ou Pandoc (fallback)
   - **DOC**: `textract` ou LibreOffice→DOCX→mammoth
   - **TXT**: leitura direta
3. Opcionalmente usa Google Gemini para estruturar melhor (se `GOOGLE_GENERATIVE_AI_API_KEY` configurada)
4. Limpa e normaliza Markdown
5. Conta palavras
6. Salva markdown temporariamente

**Código Relevante:**
```typescript
// lib/services/document-converter.ts
export async function convertDocument(filePath: string): Promise<{
  markdown: string
  wordCount: number
}> {
  const ext = path.extname(filePath).toLowerCase()
  
  if (ext === '.docx') {
    return convertDocx(filePath)
  } else if (ext === '.pdf') {
    return convertPdf(filePath)
  }
  // ... outros formatos
}
```

**Saída:**
- Markdown limpo e estruturado
- Contagem de palavras
- Arquivo temporário em `.rag-tmp/{hash}.md`

---

### Etapa 3: Filtragem por Tamanho

**Validações:**
- **Mínimo:** 300 palavras (`MIN_WORDS`)
- **Máximo:** 1.000.000 palavras (`MAX_WORDS`)

**Processo:**
```typescript
if (wordCount < MIN_WORDS) {
  await markFileRejected(path, `Muito pequeno: ${wordCount} palavras`)
  return { success: false, error: 'Documento muito pequeno' }
}

if (wordCount > MAX_WORDS) {
  await markFileRejected(path, `Muito grande: ${wordCount} palavras`)
  return { success: false, error: 'Documento muito grande' }
}
```

**Tabelas Afetadas:** `document_files` (status → `rejected`)

---

### Etapa 4: Classificação com IA

**Função:** `classifyDocument()` em `lib/services/classifier.ts`

**Processo:**
1. Carrega configuração de classificação ativa
2. Monta prompt com schema desejado
3. Envia para GPT-4 (ou modelo configurado)
4. IA retorna JSON estruturado com metadados:
   - Tipo de documento (ex: contrato, petição)
   - Área jurídica (ex: direito civil)
   - Partes envolvidas
   - Datas importantes
   - Resumo
   - Outros campos customizados
5. Valida resposta contra schema
6. Cria `TemplateDocument`
7. Salva na tabela `templates`

**Código Relevante:**
```typescript
// lib/services/classifier.ts
const response = await generateText({
  model: openai(configModel),
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.1,
})

const classification = JSON.parse(response.text)
const templateDoc = createTemplateDocument(classification, markdown, fileId)
const templateId = await storeTemplate(templateDoc, fileId)
```

**Tabelas Afetadas:** 
- `templates` (novo registro)
- `document_files` (atualização de metadados)

**Custos de IA:**
- Input: ~1000-10000 tokens (dependendo do tamanho do documento)
- Output: ~500-2000 tokens
- Modelo padrão: GPT-4

---

### Etapa 5: Geração de Chunks

**Função:** `chunkMarkdown()` em `lib/services/chunker.ts`

**Processo:**
1. Divide documento em seções lógicas
2. Respeita limites de tokens (`MAX_TOKENS=800`)
3. Evita quebrar no meio de parágrafos
4. Mantém contexto (headers são incluídos em chunks filhos)
5. Gera array de chunks com metadados:
   - `content`: texto do chunk
   - `chunkIndex`: posição no documento
   - `tokenCount`: número de tokens estimado
   - `startLine`, `endLine`: localização no markdown original

**Código Relevante:**
```typescript
// lib/services/chunker.ts
export function chunkMarkdown(
  markdown: string,
  maxTokens: number = 800
): ChunkData[] {
  const lines = markdown.split('\n')
  const chunks: ChunkData[] = []
  let currentChunk: string[] = []
  let tokenCount = 0

  for (const line of lines) {
    const lineTokens = estimateTokens(line)
    
    if (tokenCount + lineTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(createChunk(currentChunk, chunks.length))
      currentChunk = []
      tokenCount = 0
    }
    
    currentChunk.push(line)
    tokenCount += lineTokens
  }
  
  return chunks
}
```

**Saída:**
- Array de 10-500 chunks (dependendo do tamanho do documento)
- Cada chunk tem 200-800 tokens

---

### Etapa 6: Geração de Embeddings

**Função:** `generateEmbeddings()` em `lib/services/embedding-generator.ts`

**Processo:**
1. Agrupa chunks em lotes (`BATCH_SIZE=64`)
2. Para cada lote:
   - Envia para OpenAI `text-embedding-3-small`
   - Recebe vetores de 1536 dimensões
   - Armazena em array
3. Retorna embeddings na mesma ordem dos chunks

**Código Relevante:**
```typescript
// lib/services/embedding-generator.ts
export async function generateEmbeddings(
  texts: string[],
  batchSize: number = 64,
  templateId: string
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = []
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })
    
    response.data.forEach((item, idx) => {
      results.push({
        embedding: item.embedding, // [1536 dimensões]
        index: i + idx,
      })
    })
  }
  
  return results
}
```

**Custos de IA:**
- ~$0.00002 por 1000 tokens
- Documento de 50 páginas ≈ 200 chunks ≈ $0.004

**Saída:**
- Array de vetores de 1536 dimensões (float32)

---

### Etapa 7: Armazenamento no Banco

**Função:** `storeChunks()` em `lib/services/store-embeddings.ts`

**Processo:**
1. Para cada chunk + embedding:
   - Cria registro em `template_chunks`
   - Armazena conteúdo, metadados e vetor
   - pgvector indexa automaticamente para busca
2. Atualiza `documents.status` → `completed`
3. Define `documents.processedAt` → agora
4. Atualiza contadores (`totalChunks`, `totalTokens`)

**Código Relevante:**
```typescript
// lib/services/store-embeddings.ts
export async function storeChunks(
  templateId: string,
  chunks: ChunkWithEmbedding[]
) {
  const values = chunks.map((chunk, index) => ({
    templateId,
    chunkIndex: index,
    content: chunk.content,
    embedding: JSON.stringify(chunk.embedding), // pgvector
    tokenCount: chunk.tokenCount,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
  }))
  
  await db.insert(templateChunks).values(values)
}
```

**Tabelas Afetadas:**
- `template_chunks` (bulk insert)
- `documents` (status update)
- `document_files` (metadata update)

---

### Etapa 8: Busca Semântica

**Disponível após Etapa 7**

**Como Funciona:**
1. Usuário faz pergunta no chat
2. Pergunta é transformada em embedding (mesmo modelo)
3. pgvector calcula similaridade de cosseno entre embedding da pergunta e embeddings dos chunks
4. Retorna top K chunks mais similares (ex: K=5)
5. Chunks são usados como contexto para GPT-4 responder

**Código Relevante:**
```typescript
// lib/services/rag-search.ts
const queryEmbedding = await generateEmbedding(query)

const results = await db
  .select()
  .from(templateChunks)
  .where(
    sql`(embedding <=> ${JSON.stringify(queryEmbedding)}) < ${threshold}`
  )
  .orderBy(sql`embedding <=> ${JSON.stringify(queryEmbedding)}`)
  .limit(limit)
```

---

## 🗄️ Tabelas do Banco de Dados

### 1. `documents` - Registro de Upload

**Propósito:** Rastreia arquivos uploadados e status de processamento.

**Campos Principais:**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  document_type TEXT NOT NULL, -- pdf, docx, doc, txt
  
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  processed_at TIMESTAMP,
  
  total_chunks INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `organization_id` (para filtro por organização)
- `status` (para buscar pendentes/failed)
- `file_hash` (para detectar duplicatas)

---

### 2. `document_files` - Arquivo Processado (RAG)

**Propósito:** Criado durante processamento RAG. Armazena metadados do arquivo convertido.

**Campos Principais:**
```sql
CREATE TABLE document_files (
  id UUID PRIMARY KEY,
  organization_id UUID,
  created_by UUID,
  
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_type TEXT DEFAULT 'document',
  
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, rejected
  rejected_reason TEXT,
  words_count INTEGER,
  processed_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Relação com `documents`:**
- Criado quando processamento RAG inicia
- `file_path` deve corresponder ao `file_path` em `documents`
- Ambos compartilham `file_hash`

---

### 3. `templates` - Metadados Extraídos

**Propósito:** Armazena metadados estruturados extraídos pela IA (classificação).

**Campos Principais:**
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  document_file_id UUID NOT NULL REFERENCES document_files(id),
  
  template_area TEXT, -- ex: "Direito Civil"
  template_doc_type TEXT, -- ex: "Contrato"
  template_parties JSONB, -- partes envolvidas
  template_dates JSONB, -- datas importantes
  template_summary TEXT,
  metadata JSONB, -- outros campos customizados
  
  model_provider TEXT, -- ex: "openai"
  model_name TEXT, -- ex: "gpt-4"
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost DECIMAL,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**JSONB Fields:**
- `template_parties`: `["Empresa X", "João Silva"]`
- `template_dates`: `{"assinatura": "2024-01-15", "vencimento": "2025-01-15"}`
- `metadata`: campos flexíveis definidos pelo schema de classificação

---

### 4. `template_chunks` - Chunks com Embeddings

**Propósito:** Armazena pedaços do documento com vetores para busca semântica.

**Campos Principais:**
```sql
CREATE TABLE template_chunks (
  id UUID PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- pgvector!
  
  token_count INTEGER,
  start_line INTEGER,
  end_line INTEGER,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índice vetorial para busca rápida
CREATE INDEX idx_template_chunks_embedding ON template_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**pgvector:**
- `vector(1536)`: tipo especial do pgvector
- `vector_cosine_ops`: usa similaridade de cosseno
- `ivfflat`: índice aproximado (mais rápido que busca linear)

---

## 📐 Schemas e Templates

### O que é um Schema/Template?

**Schema** = Estrutura de dados que define quais metadados extrair  
**Template** = Instância preenchida do schema para um documento específico

### Exemplo de Schema

```json
{
  "name": "ContratoLocacao",
  "description": "Contrato de locação de imóveis",
  "fields": [
    {
      "name": "locador",
      "type": "text",
      "description": "Nome do locador (proprietário)"
    },
    {
      "name": "locatario",
      "type": "text",
      "description": "Nome do locatário (inquilino)"
    },
    {
      "name": "endereco_imovel",
      "type": "text",
      "description": "Endereço completo do imóvel"
    },
    {
      "name": "valor_aluguel",
      "type": "number",
      "description": "Valor mensal do aluguel em reais"
    },
    {
      "name": "data_inicio",
      "type": "date",
      "description": "Data de início do contrato"
    },
    {
      "name": "data_fim",
      "type": "date",
      "description": "Data de término do contrato (se houver)"
    }
  ]
}
```

### Exemplo de Template Preenchido

```json
{
  "templateDocType": "Contrato de Locação",
  "templateArea": "Direito Civil",
  "locador": "Maria da Silva",
  "locatario": "João Santos",
  "endereco_imovel": "Rua das Flores, 123, São Paulo - SP",
  "valor_aluguel": 2500.00,
  "data_inicio": "2024-01-01",
  "data_fim": "2025-01-01"
}
```

### Como Schemas São Usados

1. **Na Classificação (Etapa 4):**
   - IA recebe schema como parte do prompt
   - Extrai informações do documento conforme schema
   - Retorna JSON estruturado

2. **No Armazenamento:**
   - Dados são salvos em `templates.metadata` (JSONB)
   - Campos principais (area, docType) têm colunas dedicadas

3. **Na Busca:**
   - Permite filtros: "buscar apenas contratos"
   - Permite queries estruturadas: "contratos com valor > R$ 2000"

---

## 🔧 Como Intervir e Debugar

### Ver Logs de Processamento

**Console do servidor:**
```bash
# Logs em tempo real
tail -f .next/*.log

# Filtrar por documento específico
grep "[UPLOAD]" .next/*.log
grep "[PROCESS uuid-123]" .next/*.log
```

**Logs estruturados:**
Procure por tags:
- `[UPLOAD]` - Upload e salvamento
- `[PROCESS]` - Processamento RAG
- `[CLASSIFY]` - Classificação com IA
- `[CHUNK]` - Geração de chunks
- `[EMBED]` - Geração de embeddings

### Reprocessar Documento Manualmente

**Via API:**
```bash
curl -X POST http://localhost:3000/api/documents/{docId}/process \
  -H "Cookie: next-auth.session-token=..." 
```

**Via Script:**
```bash
npx tsx scripts/process-pending-documents.ts
```

### Inspecionar Dados Intermediários

**Markdown temporário:**
```bash
# Ver markdown gerado
ls -la .rag-tmp/
cat .rag-tmp/{hash}.md
```

**Banco de dados:**
```sql
-- Ver documento e status
SELECT id, file_name, status, error_message, processed_at 
FROM documents 
WHERE id = 'uuid-123';

-- Ver template extraído
SELECT t.template_doc_type, t.template_area, t.metadata
FROM templates t
JOIN document_files df ON t.document_file_id = df.id
WHERE df.file_path = '/uploads/...';

-- Ver chunks
SELECT chunk_index, token_count, LEFT(content, 100) as preview
FROM template_chunks
WHERE template_id = 'template-uuid'
ORDER BY chunk_index
LIMIT 10;

-- Testar busca semântica
SELECT chunk_index, content, 
       embedding <=> '[0.1, 0.2, ..., 0.5]' as distance
FROM template_chunks
WHERE template_id = 'template-uuid'
ORDER BY distance
LIMIT 5;
```

### Testar Pipeline Etapa por Etapa

**1. Testar Conversão:**
```typescript
import { convertDocument } from '@/lib/services/document-converter'

const result = await convertDocument('/path/to/file.pdf')
console.log(result.markdown)
console.log('Palavras:', result.wordCount)
```

**2. Testar Classificação:**
```typescript
import { classifyDocument } from '@/lib/services/classifier'

const classification = await classifyDocument(markdown)
console.log(classification)
```

**3. Testar Chunking:**
```typescript
import { chunkMarkdown } from '@/lib/services/chunker'

const chunks = chunkMarkdown(markdown, 800)
console.log(`${chunks.length} chunks gerados`)
console.log('Primeiro chunk:', chunks[0])
```

**4. Testar Embeddings:**
```typescript
import { generateEmbeddings } from '@/lib/services/embedding-generator'

const embeddings = await generateEmbeddings(['texto de teste'], 1, 'test-id')
console.log('Dimensões:', embeddings[0].embedding.length) // 1536
```

---

## 📚 Exemplos Práticos

### Exemplo 1: Adicionar Novo Campo ao Schema

**1. Atualizar configuração de classificação:**
```typescript
// Em settings/classification
{
  "fields": [
    {
      "name": "numero_processo",
      "type": "text",
      "description": "Número do processo judicial (se houver)"
    }
  ]
}
```

**2. Modelo já extrai automaticamente na próxima classificação**

**3. Buscar usando novo campo:**
```sql
SELECT * FROM templates
WHERE metadata->>'numero_processo' = '1234567-89.2024.8.26.0100';
```

### Exemplo 2: Criar Schema Customizado

**Via Interface Admin:**
1. Acesse `/admin/document-schemas`
2. Clique "Novo Schema"
3. Defina campos
4. Marque como "Ativo"

**Campos aparecem automaticamente no prompt de classificação.**

---

## 🚨 Troubleshooting

### Problema: Documento fica em "pending" para sempre

**Causas possíveis:**
1. Processamento não foi iniciado
2. Erro não capturado

**Soluções:**
```bash
# Verificar se há processo rodando
ps aux | grep "process-pending"

# Reprocessar manualmente
npx tsx scripts/process-pending-documents.ts

# Ver logs
grep "ERROR" .next/*.log | tail -20
```

### Problema: "Arquivo não encontrado" mas existe no banco

**Causa:** Arquivo foi registrado mas não salvo no disco

**Solução:**
```sql
-- Marcar como failed
UPDATE documents
SET status = 'failed',
    error_message = 'Arquivo não encontrado no disco'
WHERE id = 'uuid-123';
```

Depois faça novo upload.

### Problema: Classificação extrai dados errados

**Causa:** Prompt inadequado ou documento ambíguo

**Solução:**
1. Revisar schema de classificação
2. Adicionar exemplos ao prompt
3. Ajustar temperatura do modelo
4. Reprocessar documento

### Problema: Busca semântica não encontra documentos relevantes

**Causas:**
1. Embeddings não foram gerados
2. Threshold de similaridade muito alto
3. Query muito genérica

**Soluções:**
```sql
-- Verificar se há embeddings
SELECT COUNT(*) FROM template_chunks
WHERE template_id = 'template-uuid';

-- Testar busca com threshold mais baixo
SELECT * FROM template_chunks
WHERE embedding <=> $queryEmbedding < 0.8 -- mais permissivo
LIMIT 10;
```

---

## 📞 Suporte

**Dúvidas técnicas:** Consulte este documento primeiro  
**Bugs:** Verifique logs e tabelas antes de reportar  
**Feature requests:** Documente caso de uso e justificativa

---

**Mantido por:** Equipe de Desenvolvimento  
**Última atualização:** 04/12/2025

