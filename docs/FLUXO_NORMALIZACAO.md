# Fluxo de Normalização de Dados - QS Nexus

## Visão Geral

O sistema QS Nexus processa **3 tipos de arquivos diferentes**, cada um com seu próprio fluxo de normalização otimizado para o tipo de dado:

1. **Documentos (PDF/DOCX/TXT)** - Documentos gerais para RAG
2. **SPED (ECD/ECF)** - Arquivos contábeis estruturados  
3. **CSV** - Planilhas/dados tabulares

**Todos seguem o mesmo padrão base:**

```
Upload → Normalização → Classificação → Chunking → Embeddings → Storage
```

---

## 1. FLUXO DE DOCUMENTOS (PDF/DOCX/TXT)

### 📤 Etapa 1: Upload
- **Arquivo**: `app/api/documents/upload/route.ts`
- **Frontend**: Envia arquivo + `organizationId` via FormData
- **O que acontece**:
  - Recebe arquivo do frontend
  - Calcula hash SHA256 (evita duplicatas)
  - Salva arquivo em disco: `/public/uploads/{orgId}/{ano}/{mes}/{hash}-{nome}.{ext}`
  - Cria registro na tabela `documents` com status `pending`
- **Tabela BD**: `documents`
  - `document_type`: ENUM('pdf', 'docx', 'doc', 'txt', 'other')
  - `status`: ENUM('pending', 'processing', 'completed', 'failed')

**Exemplo de registro criado:**
```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "fileName": "contrato.docx",
  "filePath": "/uploads/org-id/2025/12/abc123-contrato.docx",
  "fileSize": 45000,
  "documentType": "docx",
  "status": "pending"
}
```

---

### 🔄 Etapa 2: Conversão para Markdown (Normalização)
- **Arquivo**: `lib/services/document-converter.ts`
- **Trigger**: Processamento assíncrono ou manual
- **O que faz**:
  - **PDF** → Extrai texto usando `pdf-parse`, converte para Markdown preservando estrutura
  - **DOCX** → Extrai texto formatado usando `mammoth`, converte para Markdown
  - **TXT** → Converte diretamente para Markdown
- **Validações**:
  - Tamanho mínimo: 100 palavras
  - Tamanho máximo: 100.000 palavras
  - Filtra documentos muito pequenos ou muito grandes
- **Resultado**: String Markdown estruturado

**Exemplo de Markdown gerado:**
```markdown
# Contrato de Prestação de Serviços

## Parte Contratante
Nome: Empresa XYZ Ltda
CNPJ: 12.345.678/0001-90

## Objeto
Prestação de serviços de consultoria...
```

---

### 🤖 Etapa 3: Classificação com IA
- **Arquivo**: `lib/services/classifier.ts`
- **Modelos suportados**: OpenAI GPT-4, Google Gemini
- **O que faz**:
  1. Carrega schema de classificação da tabela `classification_configs` (por categoria)
  2. Monta prompt com o Markdown do documento
  3. Chama LLM com schema Zod dinâmico
  4. Extrai metadados estruturados (JSON)
- **Tabela BD**: `classification_configs`
  - `document_category`: ENUM('juridico', 'contabil', 'geral')
  - Contém schemas Zod customizáveis por categoria

**Exemplo de metadados extraídos:**
```json
{
  "title": "Contrato de Prestação de Serviços - Empresa XYZ",
  "summary": "Contrato de consultoria com prazo de 12 meses...",
  "document_area": "contratual",
  "tags": ["contrato", "consultoria", "prestação de serviços"],
  "entities": {
    "contratante": "Empresa XYZ Ltda",
    "cnpj": "12.345.678/0001-90"
  }
}
```

---

### ✂️ Etapa 4: Chunking
- **Arquivo**: `lib/services/chunker.ts`
- **Estratégia**: Chunking semântico por seções
- **O que faz**:
  - Divide Markdown em chunks de **~800 tokens** (medidos com `tiktoken`)
  - Preserva contexto semântico (não corta no meio de parágrafos/seções)
  - Prioriza quebras em headers (`##`), depois parágrafos vazios
  - Cada chunk recebe índice sequencial
- **Resultado**: Array de objetos chunk

**Exemplo de chunk:**
```json
{
  "chunkIndex": 0,
  "content": "# Contrato de Prestação de Serviços\n\n## Parte Contratante...",
  "tokenCount": 450,
  "startLine": 0,
  "endLine": 25
}
```

---

### 🧠 Etapa 5: Embeddings
- **Arquivo**: `lib/services/embedding-generator.ts`
- **Modelo**: OpenAI `text-embedding-3-small` (1536 dimensões)
- **O que faz**:
  - Gera vetor de 1536 dimensões para cada chunk
  - Trunca textos que excedem limite de tokens (8191)
  - Processa em batch para eficiência
  - Conta tokens precisos com `tiktoken`
- **Resultado**: Array de vetores `number[][]`

**Exemplo:**
```javascript
[
  [0.012, -0.034, 0.056, ...], // 1536 dimensões
  [0.023, -0.045, 0.067, ...]
]
```

---

### 💾 Etapa 6: Storage
- **Arquivo**: `lib/services/store-embeddings.ts`
- **O que salva**:
  1. **`document_files`**: Link para arquivo físico + status
  2. **`templates`**: Documento classificado + metadados completos
  3. **`template_chunks`**: Chunks individuais + embeddings (pgvector)

**Estrutura final no BD:**
```
document_files (id: doc-123)
  ↓
templates (id: tpl-456, documentFileId: doc-123)
  ↓ metadata: {title, summary, tags, ...}
  ↓
template_chunks (templateId: tpl-456)
  ├─ chunk 0: "# Contrato..." + embedding[1536]
  ├─ chunk 1: "## Cláusulas..." + embedding[1536]
  └─ chunk 2: "## Vigência..." + embedding[1536]
```

---

## 2. FLUXO DE SPED (Arquivos Contábeis)

### 📤 Etapa 1: Upload
- **Arquivo**: `app/api/sped/upload/route.ts`
- **Formato**: Arquivo `.txt` com estrutura SPED (pipes `|`)
- **O que acontece**:
  - Salva arquivo em disco
  - Cria registro na tabela `sped_files`
  - **Inicia processamento assíncrono** (pode demorar minutos)
  - Retorna `jobId` para tracking via SSE
- **Tabela BD**: `sped_files`
  - `file_type`: ENUM('ecd', 'ecf')
  - `status`: ENUM('pending', 'processing', 'completed', 'failed')

---

### 🔍 Etapa 2: Parse (Normalização)
- **Arquivo**: `lib/services/sped-parser.ts`
- **O que faz**:
  - Lê arquivo linha por linha
  - Identifica tipo de registro: `I010`, `I050`, `I200`, `J050`, `J100`, etc.
  - Extrai dados estruturados:
    - **Plano de Contas** (registro I050)
    - **Saldos Contábeis** (registro I200/I250)
    - **Lançamentos** (registro J100/J150)
    - **Partidas** (registro J150 items)
- **Tabelas BD populadas**:
  - `chart_of_accounts`: Plano de contas completo
  - `account_balances`: Saldos iniciais/finais por conta
  - `journal_entries`: Cabeçalhos de lançamentos
  - `journal_items`: Débitos e créditos de cada lançamento

**Exemplo de dados parseados:**
```json
{
  "plano_contas": [
    {"codigo": "1.01.01.01", "nome": "Caixa Geral", "tipo": "A"},
    {"codigo": "2.01.01.01", "nome": "Fornecedores", "tipo": "P"}
  ],
  "saldos": [
    {"conta": "1.01.01.01", "saldo_inicial": 50000, "saldo_final": 75000}
  ],
  "lancamentos": [
    {
      "numero": "LC-001",
      "data": "2024-01-15",
      "partidas": [
        {"conta": "1.01.01.01", "debito": 10000},
        {"conta": "3.01.01.01", "credito": 10000}
      ]
    }
  ]
}
```

---

### 📝 Etapa 3: Geração de Markdown Resumo
- **Arquivo**: `lib/services/sped-classifier.ts` → `generateSpedSummaryMarkdown()`
- **O que gera**:
  - Identificação da empresa (CNPJ, nome, período)
  - Estatísticas gerais (nº de contas, saldos, lançamentos)
  - Amostra de contas principais (top 50)
  - Amostra de saldos (top 50)
- **Resultado**: Markdown estruturado otimizado para RAG

**Exemplo de Markdown gerado:**
```markdown
# Arquivo SPED ECD - Empresa XYZ Ltda

## Identificação
- **CNPJ:** 12.345.678/0001-90
- **Empresa:** Empresa XYZ Ltda
- **Período:** 2024-01-01 a 2024-12-31

## Estatísticas
- **Contas Contábeis:** 450
- **Saldos:** 450
- **Lançamentos:** 12.543
- **Partidas:** 28.765

## Principais Contas
### Ativo
- 1.01.01.01 - Caixa Geral
- 1.01.02.01 - Bancos Conta Movimento
...
```

---

### ✂️ Etapa 4: Chunking Contábil
- **Arquivo**: `lib/services/accounting-chunker.ts`
- **Implementado em**: `lib/services/sped-rag-processor.ts`
- **Estratégia**: Chunking por conta contábil
- **O que faz**:
  - Agrupa informações **por conta contábil**
  - Cada chunk contém:
    - Dados da conta (código, nome, tipo)
    - Saldo inicial e final
    - Lançamentos relacionados (débitos e créditos)
  - Mantém **contexto financeiro intacto**
  - Limite: ~800 tokens por chunk

**Exemplo de chunk contábil:**
```markdown
## Conta: 1.01.01.01 - Caixa Geral

**Tipo:** Ativo
**Saldo Inicial:** R$ 50.000,00
**Saldo Final:** R$ 75.000,00

### Lançamentos:
- 2024-01-15: D R$ 10.000,00 (LC-001 - Recebimento de vendas)
- 2024-02-20: C R$ 5.000,00 (LC-045 - Pagamento fornecedor)
...
```

---

### 🧠 Etapas 5 e 6: Embeddings + Storage
- **Mesmo processo de Documentos**
- Cada chunk contábil vira um embedding
- Storage em: `document_files`, `templates`, `template_chunks`

---

## 3. FLUXO DE CSV

### 📤 Etapa 1: Upload
- **Arquivo**: `app/api/csv/upload/route.ts`
- **Tabela BD**: `csv_imports`

---

### 🔍 Etapa 2: Parse (Normalização)
- **Arquivo**: `lib/services/csv-parser.ts`
- **Detecção automática**:
  - **Delimiter**: Testa `,` e `;` e escolhe o mais comum
  - **Encoding**: Testa UTF-8, ISO-8859-1, Windows-1252
  - **Headers**: Detecta se primeira linha é header
- **O que faz**:
  - Parse linha por linha
  - Normaliza tipos de dados (número, texto, data)
  - Detecta colunas vazias/inválidas
- **Tabela BD**: `csv_data` (dados brutos parseados, JSONB)

---

### 📊 Etapa 3: Análise Estatística + Markdown
- **Arquivo**: `lib/services/csv-rag-processor.ts` → `generateCsvAnalysisMarkdown()`
- **O que analisa**:
  - Estrutura: nº de colunas, tipos (numérico vs categórico)
  - Estatísticas por coluna: valores únicos, missing values, min/max
  - Distribuições de dados
  - Possíveis usos (financeiro, vendas, estoque)
- **O que gera**: Markdown com:
  - Resumo estatístico
  - Amostra das primeiras 50 linhas
  - Insights sobre os dados

**Exemplo de Markdown gerado:**
```markdown
# Análise CSV - vendas_2024.csv

## Estrutura
- **Total de Colunas:** 8
- **Colunas Numéricas:** 4 (valor, quantidade, desconto, total)
- **Colunas Categóricas:** 4 (data, produto, cliente, vendedor)
- **Total de Linhas:** 1.250

## Estatísticas por Coluna

### valor
- **Tipo:** Numérico
- **Valores Únicos:** 487
- **Min:** R$ 10,00
- **Max:** R$ 15.000,00
- **Média:** R$ 1.250,00

### produto
- **Tipo:** Categórico
- **Valores Únicos:** 45
- **Mais Comum:** Produto A (230 ocorrências)

## Amostra de Dados (primeiras 10 linhas)
| data       | produto   | cliente | valor    |
|------------|-----------|---------|----------|
| 2024-01-05 | Produto A | CLI-001 | 1.250,00 |
| 2024-01-05 | Produto B | CLI-002 | 850,00   |
...

## Possíveis Usos
- Análise financeira ou vendas
- Análise temporal/séries temporais
```

---

### 🤖 Etapa 4: Classificação com IA
- **Mesmo processo de Documentos**
- **O que classifica**:
  - Tipo de dados (financeiro, vendas, estoque, RH, etc)
  - Qualidade dos dados (completos, com missing values, etc)
  - Sugestões de uso

---

### ✂️ Etapa 5: Chunking Inteligente
- **Arquivo**: `lib/services/csv-rag-processor.ts`
- **Estratégia**: Chunking por grupos de linhas
- **O que faz**:
  - Divide por grupos de **50-100 linhas**
  - Cada chunk mantém **header** para contexto
  - Se houver coluna categórica importante, pode dividir por categoria
  - Cada chunk = header + N linhas + estatísticas do grupo

**Exemplo de chunk CSV:**
```markdown
## Vendas - Período 2024-01-01 a 2024-01-15 (Linhas 1-50)

| data       | produto   | cliente | valor    |
|------------|-----------|---------|----------|
| 2024-01-05 | Produto A | CLI-001 | 1.250,00 |
...

**Estatísticas do Período:**
- Total de Vendas: R$ 45.000,00
- Ticket Médio: R$ 900,00
- Produto Mais Vendido: Produto A
```

---

### 🧠 Etapas 6 e 7: Embeddings + Storage
- **Mesmo processo de Documentos**

---

## Estrutura do Banco de Dados

### 📁 Tabelas de Arquivo Bruto (por tipo)
```sql
documents          -- Documentos gerais (PDF/DOCX/TXT)
  ├─ id, fileName, filePath, fileSize, fileHash
  ├─ documentType: ENUM('pdf', 'docx', 'doc', 'txt')
  ├─ status: ENUM('pending', 'processing', 'completed', 'failed')
  └─ organizationId, uploadedBy

sped_files         -- Arquivos SPED
  ├─ id, fileName, filePath, fileHash
  ├─ fileType: ENUM('ecd', 'ecf')
  ├─ cnpj, companyName, periodStart, periodEnd
  ├─ status: ENUM('pending', 'processing', 'completed', 'failed')
  └─ organizationId, uploadedBy

csv_imports        -- Arquivos CSV
  ├─ id, fileName, filePath, fileHash
  ├─ delimiter, encoding, hasHeader
  ├─ rowCount, columnCount
  ├─ status: ENUM('pending', 'processing', 'completed', 'failed')
  └─ organizationId, uploadedBy
```

### 📊 Tabelas de Dados Parseados (específicas por tipo)
```sql
-- SPED específico
chart_of_accounts  -- Plano de contas
account_balances   -- Saldos contábeis
journal_entries    -- Lançamentos contábeis
journal_items      -- Partidas dos lançamentos

-- CSV específico
csv_data           -- Dados parseados (JSONB)
```

### 🧠 Tabelas RAG (UNIFICADAS - todos os formatos)
```sql
document_files           -- Arquivo físico + tipo + status
  ├─ id, filePath, mimeType
  ├─ fileType: ENUM('document', 'sped', 'csv')
  ├─ originalId: UUID (aponta para documents/sped_files/csv_imports)
  └─ status: ENUM('pending', 'processing', 'completed', 'failed')

classification_configs   -- Schemas de classificação
  ├─ id, name, documentCategory
  ├─ systemPrompt, modelProvider
  └─ extractionFunctionCode (schema Zod)

template_schema_configs  -- Schemas de template
  ├─ id, name, documentCategory
  └─ fields (JSONB com definições de campos)

templates                -- Documento classificado
  ├─ id, documentFileId
  ├─ title, markdown
  ├─ metadata (JSONB com dados classificados)
  ├─ costUsd, tokensUsed
  └─ organizationId, createdBy

template_chunks          -- Chunks + embeddings
  ├─ id, templateId
  ├─ chunkIndex, content
  ├─ embedding: vector(1536)  ← pgvector
  ├─ tokenCount
  └─ metadata (JSONB)
```

### 🔗 Relacionamentos
```
documents → document_files → templates → template_chunks
                                ↓
                           embedding (vector)

sped_files → document_files → templates → template_chunks
    ↓
chart_of_accounts, account_balances, journal_entries

csv_imports → document_files → templates → template_chunks
    ↓
csv_data
```

---

## Fluxo Visual Completo

```
┌─────────────────────────────────────────────────────────────┐
│                        UPLOAD                               │
│  Frontend → API → Salva Disco → Cria Registro BD           │
│                                                             │
│  Documentos: documents                                      │
│  SPED:       sped_files                                     │
│  CSV:        csv_imports                                    │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    NORMALIZAÇÃO                             │
│  Converte para formato comum (Markdown)                    │
│                                                             │
│  Documentos: PDF→MD, DOCX→MD, TXT→MD                       │
│  SPED:       Parse → Resumo Markdown                       │
│  CSV:        Parse → Análise Markdown                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   CLASSIFICAÇÃO                             │
│  IA extrai metadados estruturados                          │
│                                                             │
│  LLM (GPT-4/Gemini) + Schema Zod                          │
│  → {title, summary, area, tags, entities, ...}            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                     CHUNKING                                │
│  Divide em pedaços menores (~800 tokens)                   │
│                                                             │
│  Documentos: Por semântica (headers, parágrafos)           │
│  SPED:       Por conta contábil                            │
│  CSV:        Por grupo de linhas (50-100)                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    EMBEDDINGS                               │
│  Gera vetores (1536 dims) para cada chunk                  │
│                                                             │
│  OpenAI text-embedding-3-small                             │
│  → [0.012, -0.034, 0.056, ...]                            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                     STORAGE                                 │
│  Salva tudo no PostgreSQL + pgvector                       │
│                                                             │
│  document_files → templates → template_chunks              │
│                                   ↓                         │
│                              embedding: vector(1536)        │
└─────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   RAG QUERY                                 │
│  Busca semântica usando vetores                            │
│                                                             │
│  User Query → Embedding → Cosine Similarity → Top Results  │
└─────────────────────────────────────────────────────────────┘
```

---

## Diferenças Entre os Formatos

### Por que cada formato é diferente?

| Aspecto | Documentos | SPED | CSV |
|---------|-----------|------|-----|
| **Estrutura Original** | Texto corrido/formatado | Linhas com pipes (estruturado) | Tabela (linhas x colunas) |
| **Normalização** | Conversão para Markdown | Parse de registros → Markdown resumo | Parse + análise → Markdown |
| **Chunking** | Semântico (por seções) | Por conta contábil | Por grupos de linhas |
| **Objetivo** | Busca por conceitos | Busca por contas/lançamentos | Busca por dados tabulares |
| **Tabelas BD Específicas** | Nenhuma (só documento) | chart_of_accounts, balances, etc | csv_data |
| **Tempo de Processamento** | Rápido (segundos) | Lento (minutos) | Médio (segundos a minutos) |

---

## Estado Atual do Sistema

### ✅ O que está implementado e funcionando:
- ✅ Fluxo completo de Documentos (upload → RAG → query)
- ✅ Upload + Parse de SPED
- ✅ Upload + Parse de CSV
- ✅ SPED RAG processor (código implementado)
- ✅ CSV RAG processor (código implementado)
- ✅ Dashboard unificado de status
- ✅ Testes automatizados
- ✅ Documentação de usuário

### ⚠️ O que está implementado mas NÃO testado:
- ⚠️ SPED RAG end-to-end (chunking + embeddings)
- ⚠️ CSV RAG end-to-end (chunking + embeddings)
- ⚠️ Upload de DOCX (teve problemas de ENUM, foi corrigido mas não testado)

### ❌ O que está quebrado/inconsistente:
- ❌ Tabela `documents`: coluna `document_type` foi deletada e recriada
  - Pode ter dados inconsistentes
  - Registros antigos podem ter `document_type = NULL` ou 'other'
- ❌ Banco de dados pode ter registros órfãos de migrações anteriores

### ❓ O que NÃO sabemos (precisa testar):
- ❓ Upload de DOCX funciona após fix de ENUM?
- ❓ SPED gera chunks + embeddings corretamente?
- ❓ CSV gera chunks + embeddings corretamente?
- ❓ Busca vetorial (RAG query) retorna resultados relevantes?
- ❓ Performance com arquivos grandes (10MB+, 100k+ linhas)?

---

## Próximos Passos (Plano de Validação)

### 1. Validar Banco de Dados
```sql
-- Verificar ENUMs
SELECT typname, enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE typname LIKE '%document%';

-- Verificar coluna document_type existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name = 'document_type';

-- Contar registros por status
SELECT status, COUNT(*) 
FROM documents 
GROUP BY status;

SELECT status, COUNT(*) 
FROM sped_files 
GROUP BY status;

SELECT status, COUNT(*) 
FROM csv_imports 
GROUP BY status;
```

### 2. Testar Upload de DOCX
1. Hard refresh no navegador (Cmd+Shift+R)
2. Upload de 1 arquivo DOCX pequeno (~50KB)
3. Verificar logs do servidor
4. Confirmar registro em `documents` com `status = 'pending'`
5. Triggerar processamento manual

### 3. Testar Processamento RAG
1. Para cada formato (DOC, SPED, CSV):
   - Fazer upload
   - Aguardar processamento completo
   - Verificar `templates` criado
   - Verificar `template_chunks` com embeddings
   - Contar chunks gerados

### 4. Validação End-to-End
1. Upload de 1 arquivo de cada tipo
2. Aguardar processamento completo (status='completed')
3. Fazer query RAG: "resumo do contrato" / "saldo da conta caixa" / "total de vendas"
4. Verificar se chunks retornados são relevantes
5. Medir tempo de resposta

### 5. Testes de Performance
- Arquivo DOCX grande (5MB+)
- Arquivo SPED grande (100k+ linhas)
- Arquivo CSV grande (50k+ linhas)
- Medir tempo de processamento
- Verificar uso de memória
- Verificar número de chunks gerados

---

## Glossário

- **Normalização**: Conversão de diferentes formatos (PDF, SPED, CSV) para formato comum (Markdown)
- **Chunking**: Divisão de documento em pedaços menores (~800 tokens)
- **Embedding**: Vetor numérico (1536 dimensões) que representa semanticamente um chunk
- **Template**: Documento normalizado + classificado + metadados
- **RAG** (Retrieval-Augmented Generation): Busca semântica + geração de resposta com LLM
- **pgvector**: Extensão PostgreSQL para armazenar e buscar vetores
- **Cosine Similarity**: Métrica de similaridade entre vetores (usado na busca)

---

## Referências

### Arquivos Principais
- Upload: `app/api/documents/upload/route.ts`, `app/api/sped/upload/route.ts`, `app/api/csv/upload/route.ts`
- Normalização: `lib/services/document-converter.ts`, `lib/services/sped-parser.ts`, `lib/services/csv-parser.ts`
- Classificação: `lib/services/classifier.ts`, `lib/services/sped-classifier.ts`
- Chunking: `lib/services/chunker.ts`, `lib/services/accounting-chunker.ts`
- Embeddings: `lib/services/embedding-generator.ts`
- Storage: `lib/services/store-embeddings.ts`
- RAG Processors: `lib/services/rag-processor.ts`, `lib/services/sped-rag-processor.ts`, `lib/services/csv-rag-processor.ts`

### Schemas BD
- Documentos: `lib/db/schema/documents.ts`
- SPED: `lib/db/schema/sped.ts`
- CSV: `lib/db/schema/csv.ts`
- RAG: `lib/db/schema/rag.ts`

