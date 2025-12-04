# Nomenclatura Oficial do Sistema QS Nexus

## Visão Geral

Este documento define a **nomenclatura oficial** de todos os conceitos, entidades e processos do sistema QS Nexus, eliminando ambiguidades e estabelecendo uma linguagem comum entre código, banco de dados e interface de usuário.

---

## 1. Entidades Principais

### 1.1. Schema de Documento

**Definição**: Estrutura customizável que define quais campos existem em um tipo específico de documento e como os dados devem ser armazenados.

**Nome no código**: `DocumentSchema`  
**Tabela BD**: `document_schemas`  
**Arquivo**: `lib/db/schema/document-schemas.ts`

**Componentes**:
- `name`: Nome amigável (ex: "Contratos de Prestação", "Notas Fiscais NFe")
- `baseType`: Tipo base (document, sped, csv)
- `category`: Categoria (juridico, contabil, geral)
- `tableName`: Nome da tabela SQL que será criada (ex: `contratos_prestacao`)
- `fields`: Array de definições de campos
  - `fieldName`: Nome do campo (snake_case)
  - `fieldType`: Tipo (text, numeric, date, boolean)
  - `displayName`: Nome amigável ("Contratante", "Valor do Contrato")
  - `isRequired`: Campo obrigatório?
  - `description`: Descrição/dica para IA
- `enableRAG`: Habilitar busca semântica (embeddings)?
- `isActive`: Schema ativo?

**Exemplo**:
```json
{
  "name": "Contratos de Prestação de Serviços",
  "baseType": "document",
  "category": "juridico",
  "tableName": "contratos_prestacao",
  "fields": [
    {
      "fieldName": "contratante",
      "fieldType": "text",
      "displayName": "Contratante",
      "isRequired": true,
      "description": "Nome ou razão social do contratante"
    },
    {
      "fieldName": "contratado",
      "fieldType": "text",
      "displayName": "Contratado",
      "isRequired": true
    },
    {
      "fieldName": "valor_contrato",
      "fieldType": "numeric",
      "displayName": "Valor do Contrato (R$)",
      "isRequired": false
    },
    {
      "fieldName": "data_assinatura",
      "fieldType": "date",
      "displayName": "Data de Assinatura",
      "isRequired": false
    },
    {
      "fieldName": "prazo_meses",
      "fieldType": "numeric",
      "displayName": "Prazo (meses)",
      "isRequired": false
    }
  ],
  "enableRAG": true,
  "isActive": true
}
```

**Quando criado**: Sistema executa `CREATE TABLE contratos_prestacao (...)` no PostgreSQL

---

### 1.2. Perfil de Classificação

**Definição**: Configuração de IA que define COMO extrair dados de documentos usando um Schema de Documento.

**Nome no código**: `ClassificationProfile`  
**Tabela BD**: `classification_profiles` (renomeado de `classification_configs`)  
**Arquivo**: `lib/db/schema/classification-profiles.ts`

**Componentes**:
- `name`: Nome interno (ex: "profile_contratos_prestacao")
- `documentSchemaId`: Link para o Schema de Documento
- `systemPrompt`: Instrução para o LLM
- `modelProvider`: openai | google
- `modelName`: "gpt-4", "gemini-pro"
- `temperature`: 0.0-1.0 (quanto menor, mais preciso)
- `maxInputTokens`, `maxOutputTokens`

**Relação**: 1 Schema de Documento → 1 Perfil de Classificação (1:1)

**Exemplo**:
```json
{
  "name": "profile_contratos_prestacao",
  "documentSchemaId": "uuid-do-schema",
  "systemPrompt": "Você é um especialista em contratos. Analise o documento e extraia APENAS os seguintes campos: contratante, contratado, valor_contrato, data_assinatura, prazo_meses. Retorne JSON estruturado.",
  "modelProvider": "openai",
  "modelName": "gpt-4",
  "temperature": 0.1
}
```

---

### 1.3. Documento Processado

**Definição**: Documento que passou pela pipeline completa (conversão + classificação + fragmentação + vetorização) e está pronto para busca.

**Nome no código**: `ProcessedDocument`  
**Tabela BD**: `processed_documents` (renomeado de `templates`)  
**Arquivo**: `lib/db/schema/processed-documents.ts`

**Componentes**:
- `documentFileId`: Link para arquivo original
- `documentSchemaId`: Qual schema foi usado
- `title`: Título extraído
- `markdown`: Texto normalizado
- `metadata`: Metadados extraídos (JSON)
- `customTableRecord`: UUID do registro na tabela customizada (ex: id em `contratos_prestacao`)

**Relação**: 
- 1 Documento Original → 1 Documento Processado
- 1 Documento Processado → 1 Registro na Tabela Customizada
- 1 Documento Processado → N Fragmentos de Busca

---

### 1.4. Fragmento de Busca

**Definição**: Pedaço do documento com embedding (vetor) para busca semântica.

**Nome no código**: `DocumentChunk`  
**Tabela BD**: `document_chunks` (renomeado de `template_chunks`)  
**Arquivo**: `lib/db/schema/document-chunks.ts`

**Componentes**:
- `processedDocumentId`: Link para documento processado
- `chunkIndex`: Posição no documento
- `content`: Texto do fragmento
- `embedding`: Vetor (1536 dims, pgvector)
- `tokenCount`: Tamanho em tokens

---

## 2. Etapas da Pipeline (Nomenclatura Oficial)

### Etapa 1: Upload
**O que é**: Usuário envia arquivo, sistema salva em disco  
**Termo oficial**: **Upload**  
**Status após**: `pending`

### Etapa 2: Conversão
**O que é**: Transforma PDF/DOCX em Markdown  
**Termo oficial**: **Conversão** (não "normalização")  
**Resultado**: String Markdown

### Etapa 3: Classificação Inteligente
**O que é**: IA extrai metadados estruturados usando Schema de Documento  
**Termo oficial**: **Classificação Inteligente**  
**Input**: Markdown + Schema de Documento  
**Output**: JSON com campos extraídos

### Etapa 4: Fragmentação
**O que é**: Divide documento em pedaços menores  
**Termo oficial**: **Fragmentação** (não "chunking")  
**Resultado**: Array de fragmentos (~800 tokens cada)

### Etapa 5: Vetorização
**O que é**: Gera vetores para busca semântica  
**Termo oficial**: **Vetorização** (não "embeddings")  
**Resultado**: Array de vetores (1536 dims)

### Etapa 6: Indexação Dupla
**O que é**: Salva dados em 2 lugares simultaneamente  
**Termo oficial**: **Indexação Dupla**  
**Destinos**:
1. **Tabela Customizada**: Dados estruturados para queries SQL
2. **Índice RAG**: Fragmentos com vetores para busca semântica

---

## 3. Conceitos Importantes

### 3.1. Tipo Base
**Definição**: Categoria raiz do documento (define o fluxo de processamento)

**Valores**: `document`, `sped`, `csv`

**Diferença**:
- `document`: Arquivos gerais (PDF/DOCX/TXT) - conversão para Markdown
- `sped`: Arquivos contábeis estruturados - parse de registros
- `csv`: Planilhas tabulares - parse de linhas/colunas

**Uso**: Todo Schema de Documento tem 1 Tipo Base

---

### 3.2. Categoria de Documento
**Definição**: Classificação semântica do documento (para organização)

**Valores**: `juridico`, `contabil`, `geral`

**Diferença**:
- `juridico`: Contratos, petições, processos
- `contabil`: Notas fiscais, balanços, SPED
- `geral`: Outros documentos

**Uso**: Agrupa Schemas de Documento, opcional

---

### 3.3. Indexação Dupla (Dual Storage)
**Definição**: Estratégia de salvar dados extraídos em 2 formatos simultaneamente

**Formato 1 - Tabela SQL Customizada**:
- Criada dinamicamente via `CREATE TABLE`
- Campos tipados (TEXT, NUMERIC, DATE, BOOLEAN)
- Queries SQL eficientes (WHERE, JOIN, GROUP BY)
- Usado para: Relatórios, análises, exportações

**Formato 2 - Índice RAG**:
- Tabelas fixas: `processed_documents` + `document_chunks`
- Fragmentos com embeddings (pgvector)
- Busca por similaridade vetorial
- Usado para: Chat IA, busca semântica

**Exemplo**:
```
Upload: contrato.pdf

↓ Classificação ↓

Extrai: {
  contratante: "XYZ Ltda",
  valor: 50000,
  prazo: "2025-12-31"
}

↓ Salva em AMBOS ↓

1️⃣ Tabela SQL `contratos_prestacao`:
   INSERT INTO contratos_prestacao 
   (id, contratante, valor, prazo, document_id)
   VALUES ('uuid', 'XYZ Ltda', 50000, '2025-12-31', 'doc-uuid')

2️⃣ Índice RAG `processed_documents` + `document_chunks`:
   INSERT INTO processed_documents 
   (id, title, markdown, metadata)
   VALUES ('uuid', 'Contrato XYZ', '# Contrato...', '{...}')
   
   INSERT INTO document_chunks
   (processed_document_id, content, embedding)
   VALUES ('uuid', 'chunk text', '[0.012, -0.034, ...]')
```

---

## 4. Fluxo de Criação de Schema (Admin)

### Passo 1: Admin Cria Schema de Documento

**Tela**: `/admin/document-schemas/new`

**Formulário**:
```
Nome do Schema: [Contratos de Prestação de Serviços]

Tipo Base: 
  (•) Documentos (PDF/DOCX/TXT)
  ( ) SPED (Arquivos Contábeis)
  ( ) CSV (Planilhas)

Categoria: 
  [▼ Jurídico]
    - Jurídico
    - Contábil
    - Geral

Nome da Tabela: [contratos_prestacao]
  ℹ️ Será criada no banco: public.contratos_prestacao

┌─────────────────────────────────────────────┐
│ Campos do Schema                            │
├─────────────────────────────────────────────┤
│                                             │
│ Campo 1:                                    │
│   Nome do Campo: [contratante]             │
│   Nome de Exibição: [Contratante]          │
│   Tipo: [▼ Texto]                          │
│   [✓] Obrigatório                          │
│   Descrição: [Razão social do contratante] │
│   [Remover Campo]                           │
│                                             │
│ Campo 2:                                    │
│   Nome do Campo: [valor_contrato]          │
│   Nome de Exibição: [Valor do Contrato]    │
│   Tipo: [▼ Número (Moeda)]                 │
│   [ ] Obrigatório                          │
│   [Remover Campo]                           │
│                                             │
│ [+ Adicionar Campo]                         │
│                                             │
└─────────────────────────────────────────────┘

Configurações RAG:
  [✓] Habilitar busca semântica (RAG)
  [✓] Gerar fragmentos de busca
  
Configuração de IA:
  Modelo: [▼ GPT-4 (OpenAI)]
  Temperature: [0.1] (0=preciso, 1=criativo)
  
[Cancelar]  [Pré-visualizar SQL]  [Criar Schema]
```

### Passo 2: Sistema Gera e Executa SQL

Quando admin clica "Criar Schema", sistema:

1. **Gera SQL**:
```sql
CREATE TABLE IF NOT EXISTS contratos_prestacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link para documento original
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  processed_document_id UUID REFERENCES processed_documents(id),
  
  -- Multi-tenant
  organization_id UUID NOT NULL,
  
  -- Campos customizados
  contratante TEXT NOT NULL,
  contratado TEXT,
  valor_contrato NUMERIC(15,2),
  data_assinatura DATE,
  prazo_meses INTEGER,
  objeto TEXT,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  
  -- Índices
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_contratos_org ON contratos_prestacao(organization_id);
CREATE INDEX idx_contratos_doc ON contratos_prestacao(document_id);
CREATE INDEX idx_contratos_valor ON contratos_prestacao(valor_contrato);
CREATE INDEX idx_contratos_data ON contratos_prestacao(data_assinatura);
```

2. **Executa no banco**
3. **Salva metadata do schema** na tabela `document_schemas`
4. **Cria Perfil de Classificação** automaticamente

---

## 5. Fluxo do Usuário: Upload com Schema

### Passo 1: Usuário Faz Upload

```
┌────────────────────────────────────────────┐
│ 📤 Upload de Documentos                    │
├────────────────────────────────────────────┤
│                                            │
│ Arquivos (1):                              │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ 📄 contrato-xyz.pdf        (45 KB)    │ │
│ │                                        │ │
│ │ 🤖 Detectando tipo...                 │ │
│ │ ✓ Detectado: Contrato                 │ │
│ │                                        │ │
│ │ Schema Sugerido:                       │ │
│ │ 📋 Contratos de Prestação de Serviços │ │
│ │    Confiança: 95% ⭐⭐⭐              │ │
│ │                                        │ │
│ │ (•) Usar schema sugerido              │ │
│ │ ( ) Escolher outro:                    │ │
│ │     [▼ Selecione...        ]          │ │
│ │                                        │ │
│ │ Campos que serão extraídos:           │ │
│ │ • Contratante, Contratado             │ │
│ │ • Valor do Contrato                   │ │
│ │ • Data de Assinatura, Prazo           │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ [Cancelar]        [Processar Documento]   │
└────────────────────────────────────────────┘
```

### Passo 2: Sistema Processa

```
Processamento:
1. ✓ Conversão PDF → Markdown
2. ⏳ Classificação Inteligente
   └─ Usando Schema: "Contratos de Prestação"
   └─ Modelo: GPT-4
   └─ Extraindo campos...
3. ⏳ Indexação Dupla
   └─ Salvando em: contratos_prestacao
   └─ Salvando em: processed_documents
4. ⏳ Fragmentação e Vetorização
5. ✓ Concluído!
```

### Passo 3: Resultado - Dual Storage

**Tabela Customizada** (`contratos_prestacao`):
```sql
id | document_id | contratante | valor_contrato | data_assinatura
---|-------------|-------------|----------------|----------------
uuid-1 | doc-123 | XYZ Ltda | 50000.00 | 2025-01-15
```

**Índice RAG** (`processed_documents` + `document_chunks`):
```
processed_documents:
  id: proc-456
  title: "Contrato XYZ Ltda - Prestação de Serviços"
  markdown: "# Contrato\n\n..."
  metadata: {contratante: "XYZ Ltda", ...}
  
document_chunks:
  id: chunk-789, content: "# Contrato...", embedding: [0.012, ...]
  id: chunk-790, content: "## Cláusulas...", embedding: [0.023, ...]
```

---

## 6. Nomenclatura das Etapas

### Nomenclatura ANTIGA → NOVA

| Termo Antigo | Termo Oficial | Justificativa |
|--------------|---------------|---------------|
| Normalização | **Conversão** | Mais específico (conversão de formato) |
| Classificação | **Classificação Inteligente** | Deixa claro que usa IA |
| Template | **Schema de Documento** | Evita ambiguidade |
| Template (tabela) | **Documento Processado** | Mais descritivo |
| Template Chunk | **Fragmento de Busca** | Mais compreensível |
| Chunking | **Fragmentação** | Termo em português |
| Embeddings | **Vetorização** | Termo em português |
| Storage | **Indexação** | Mais preciso |
| Classification Config | **Perfil de Classificação** | Mais intuitivo |

---

## 7. Variáveis Configuráveis pelo Admin

### Em Schema de Documento (`document_schemas`)

| Variável | Tipo | Obrigatório | Descrição |
|----------|------|-------------|-----------|
| `name` | text | ✓ | Nome amigável do schema |
| `base_type` | enum | ✓ | document, sped, csv |
| `category` | enum | | juridico, contabil, geral |
| `table_name` | text | ✓ | Nome da tabela SQL (snake_case) |
| `fields` | jsonb | ✓ | Array de definições de campos |
| `enable_rag` | boolean | ✓ | Habilitar busca semântica? |
| `is_active` | boolean | ✓ | Schema ativo? |
| `is_default_for_type` | boolean | | Padrão para este tipo base? |

### Em Campos (`fields` array)

| Variável | Tipo | Obrigatório | Descrição |
|----------|------|-------------|-----------|
| `field_name` | text | ✓ | Nome no BD (snake_case) |
| `display_name` | text | ✓ | Nome amigável ("Valor do Contrato") |
| `field_type` | enum | ✓ | text, numeric, date, boolean |
| `is_required` | boolean | ✓ | Campo obrigatório na extração? |
| `description` | text | | Dica para a IA |
| `validation_rules` | jsonb | | Regras (min, max, regex) |
| `default_value` | text | | Valor padrão se IA não extrair |

### Em Perfil de Classificação (`classification_profiles`)

| Variável | Tipo | Obrigatório | Descrição |
|----------|------|-------------|-----------|
| `document_schema_id` | uuid | ✓ | Link para schema |
| `system_prompt` | text | ✓ | Instrução para LLM |
| `model_provider` | enum | ✓ | openai, google |
| `model_name` | text | ✓ | "gpt-4", "gemini-pro" |
| `temperature` | decimal | | 0.0-1.0 (padrão 0.1) |
| `max_input_tokens` | integer | | Limite entrada (padrão 8000) |
| `max_output_tokens` | integer | | Limite saída (padrão 2000) |

---

## 8. Tipos de Campos Suportados

### Versão 1.0 (Implementação Inicial)

| Tipo | SQL Type | Validação | Exemplo |
|------|----------|-----------|---------|
| `text` | TEXT | Máx 10.000 chars | "Empresa XYZ Ltda" |
| `numeric` | NUMERIC(15,2) | Números decimais | 50000.00 |
| `date` | DATE | Formato ISO | 2025-01-15 |
| `boolean` | BOOLEAN | true/false | true |

### Versão 2.0 (Futuro)

| Tipo | SQL Type | Descrição |
|------|----------|-----------|
| `text_long` | TEXT | Textos longos (cláusulas) |
| `integer` | INTEGER | Números inteiros |
| `money` | NUMERIC(15,2) | Valores monetários (com moeda) |
| `enum` | ENUM customizado | Lista fixa de valores |
| `array` | TEXT[] | Lista de valores |
| `relation` | UUID + FK | Relacionamento com outra tabela |

---

## 9. Exemplo Completo: Contratos de Prestação

### Admin Cria Schema

**Input Admin**:
```
Nome: "Contratos de Prestação de Serviços"
Tipo Base: Documentos
Categoria: Jurídico
Tabela: contratos_prestacao

Campos:
  1. contratante (Texto, Obrigatório) - "Razão social do contratante"
  2. contratado (Texto, Obrigatório) - "Nome do contratado"
  3. valor_contrato (Número, Opcional) - "Valor total em reais"
  4. data_assinatura (Data, Opcional)
  5. prazo_meses (Número, Opcional)
  6. objeto (Texto, Opcional) - "Objeto do contrato"

Habilitar RAG: Sim
Modelo IA: GPT-4
```

**Sistema Executa**:
```sql
CREATE TABLE contratos_prestacao (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id),
  processed_document_id UUID REFERENCES processed_documents(id),
  organization_id UUID NOT NULL,
  
  contratante TEXT NOT NULL,
  contratado TEXT NOT NULL,
  valor_contrato NUMERIC(15,2),
  data_assinatura DATE,
  prazo_meses INTEGER,
  objeto TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Sistema Cria Perfil**:
```
Prompt: "Você é especialista em contratos. Analise e extraia: 
contratante (obrigatório), contratado (obrigatório), 
valor_contrato, data_assinatura, prazo_meses, objeto. 
Retorne JSON estruturado."
```

### Usuário Faz Upload

**Upload**: `contrato-empresa-abc.pdf`

**Auto-Detecção**: Sugere "Contratos de Prestação" (95% confiança)

**Processamento**:
1. Conversão: PDF → Markdown
2. Classificação: GPT-4 extrai dados
   ```json
   {
     "contratante": "Empresa ABC Ltda",
     "contratado": "João Silva Consultoria",
     "valor_contrato": 75000,
     "data_assinatura": "2025-01-10",
     "prazo_meses": 12,
     "objeto": "Consultoria em TI"
   }
   ```
3. Indexação Dupla:
   - SQL: `INSERT INTO contratos_prestacao (...)`
   - RAG: `INSERT INTO processed_documents (...)`
4. Fragmentação: 5 chunks gerados
5. Vetorização: 5 embeddings criados

**Resultado Final**:

**Query SQL**:
```sql
SELECT contratante, valor_contrato, data_assinatura
FROM contratos_prestacao
WHERE valor_contrato > 50000
  AND organization_id = 'org-uuid'
ORDER BY data_assinatura DESC;
```

**Query RAG** (Chat):
```
User: "Quais contratos foram assinados em janeiro?"
System: [busca vetorial] → retorna fragmentos relevantes
```

---

## 10. Estrutura do Banco de Dados Atualizada

### Tabelas do Sistema (Fixas)

```
organizations              -- Organizações
users                      -- Usuários
documents                  -- Docs gerais (PDF/DOCX/TXT)
sped_files                 -- Arquivos SPED
csv_imports                -- Arquivos CSV (a criar)
document_files             -- Arquivos físicos unificados
```

### Tabelas de Configuração (Fixas)

```
document_schemas           -- Schemas de documentos customizados
classification_profiles    -- Perfis de classificação (IA)
processed_documents        -- Documentos processados (RAG)
document_chunks            -- Fragmentos com embeddings
```

### Tabelas Customizadas (Dinâmicas - criadas por admin)

```
contratos_prestacao        -- Criada pelo admin
notas_fiscais_entrada      -- Criada pelo admin
pedidos_compra             -- Criada pelo admin
balancetes_mensais         -- Criada pelo admin
planilhas_vendas           -- Criada pelo admin
...                        -- Quantas o admin quiser criar
```

**Padrão de Nomenclatura**:
- Snake_case
- Plural (boas práticas SQL)
- Prefixo opcional por tipo: `doc_`, `sped_`, `csv_`

---

## 11. Implementação Técnica

### Arquivo 1: Schema de Definição
**Path**: `lib/db/schema/document-schemas.ts`

```typescript
export const documentSchemas = pgTable('document_schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  
  // Identificação
  name: text('name').notNull(),
  baseType: baseTypeEnum('base_type').notNull(), // document|sped|csv
  category: documentCategoryEnum('category'),
  tableName: text('table_name').notNull(), // contratos_prestacao
  
  // Schema de campos
  fields: jsonb('fields').notNull(), // Array de field definitions
  
  // Configurações
  enableRAG: boolean('enable_rag').default(true),
  isActive: boolean('is_active').default(true),
  isDefaultForType: boolean('is_default_for_type').default(false),
  
  // Auditoria
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

### Arquivo 2: Migration Engine
**Path**: `lib/services/schema-migration-engine.ts`

```typescript
export async function createCustomTable(schema: DocumentSchema): Promise<void> {
  // Gera SQL CREATE TABLE
  const sql = generateCreateTableSQL(schema)
  
  // Executa no banco
  await db.execute(sql)
  
  // Salva metadata
  await db.insert(documentSchemas).values(schema)
  
  // Cria perfil de classificação
  await createClassificationProfile(schema)
}

function generateCreateTableSQL(schema: DocumentSchema): string {
  // Gera SQL baseado nos campos definidos
  // Inclui colunas obrigatórias (id, document_id, organization_id)
  // Adiciona campos customizados
  // Cria índices automáticos
}
```

### Arquivo 3: Dual Storage Handler
**Path**: `lib/services/dual-storage-handler.ts`

```typescript
export async function saveToDualStorage(
  documentId: string,
  schemaId: string,
  extractedData: Record<string, any>,
  markdown: string,
  chunks: DocumentChunk[]
): Promise<void> {
  // 1. Salvar em tabela customizada
  const customTableRecord = await saveToCustomTable(schemaId, documentId, extractedData)
  
  // 2. Salvar em RAG (se habilitado)
  if (schema.enableRAG) {
    await saveToRAG(documentId, schemaId, markdown, extractedData, chunks, customTableRecord.id)
  }
}
```

---

## 12. Regras de Negócio

### 12.1. Criação de Schemas

- ✓ Apenas **admins** podem criar schemas
- ✓ Nome da tabela deve ser **único** por organização
- ✓ Tabelas são **multi-tenant** (obrigatório `organization_id`)
- ✓ Campos obrigatórios do sistema: `id`, `document_id`, `organization_id`, `created_at`
- ✓ Admin pode definir até **50 campos customizados** por schema
- ✓ Nomes de campos: snake_case, sem caracteres especiais

### 12.2. Auto-Detecção

- ✓ Se confiança > 90%: sugestão "forte" (UI destaca)
- ✓ Se confiança 70-90%: sugestão "média" (UI mostra alternativas)
- ✓ Se confiança < 70%: sem sugestão (usuário escolhe manualmente)
- ✓ Se há apenas 1 schema ativo para o tipo base: usa automaticamente
- ✓ Se há 0 schemas ativos: usa schema "Geral" padrão

### 12.3. Processamento

- ✓ Se classificação falha: salva apenas em RAG (sem tabela customizada)
- ✓ Se RAG desabilitado no schema: salva apenas em tabela customizada
- ✓ Campos obrigatórios não extraídos: processamento falha com erro claro
- ✓ Campos opcionais não extraídos: salvos como NULL

### 12.4. Queries e Busca

**Query SQL** (dados estruturados):
```sql
-- Contratos acima de 50k
SELECT * FROM contratos_prestacao 
WHERE valor_contrato > 50000;

-- Contratos por período
SELECT * FROM contratos_prestacao
WHERE data_assinatura BETWEEN '2025-01-01' AND '2025-12-31';
```

**Query RAG** (busca semântica):
```
User: "Contratos que mencionam serviços de TI"
System: SELECT * FROM document_chunks 
        WHERE embedding <=> query_embedding 
        ORDER BY similarity DESC;
```

---

## 13. Exemplo: SPED com Tabela Customizada

### Admin Cria Schema para SPED

```
Nome: "Balancetes Mensais SPED"
Tipo Base: SPED
Categoria: Contábil
Tabela: sped_balancetes

Campos:
  1. cnpj (Texto, Obrigatório)
  2. razao_social (Texto, Obrigatório)
  3. periodo_inicio (Data, Obrigatório)
  4. periodo_fim (Data, Obrigatório)
  5. total_ativo (Número, Opcional)
  6. total_passivo (Número, Opcional)
  7. resultado_periodo (Número, Opcional)

Habilitar RAG: Sim
```

**Sistema Cria**:
```sql
CREATE TABLE sped_balancetes (
  id UUID PRIMARY KEY,
  sped_file_id UUID NOT NULL REFERENCES sped_files(id),
  processed_document_id UUID REFERENCES processed_documents(id),
  organization_id UUID NOT NULL,
  
  cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  total_ativo NUMERIC(15,2),
  total_passivo NUMERIC(15,2),
  resultado_periodo NUMERIC(15,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Usuário Faz Upload de SPED

1. Upload: `sped_ecd_empresa_2024.txt`
2. Parse: Extrai contas, saldos, lançamentos
3. Classificação: IA extrai totais de ativo/passivo/resultado
4. Dual Storage:
   - `sped_balancetes`: 1 linha com totais
   - `chart_of_accounts`, `account_balances`: dados detalhados
   - `processed_documents` + `document_chunks`: RAG

**Queries possíveis**:
```sql
-- SQL: Evolução mensal
SELECT periodo_inicio, total_ativo, total_passivo
FROM sped_balancetes
WHERE organization_id = 'org-uuid'
ORDER BY periodo_inicio;

-- RAG: Busca semântica
"Qual foi o resultado do período de janeiro?"
```

---

## 14. Roadmap de Implementação

### Sprint 1: Fundação (CRÍTICO)
- [ ] Criar tabela `document_schemas`
- [ ] Criar `schema-migration-engine.ts` (gera e executa CREATE TABLE)
- [ ] Criar `dual-storage-handler.ts` (salva em ambos)
- [ ] Documentar nomenclatura oficial

### Sprint 2: Auto-Detecção (IMPORTANTE)
- [ ] Criar `profile-detector.ts` (auto-detecção)
- [ ] Integrar na API de upload
- [ ] Criar endpoint `/api/documents/detect-schema`

### Sprint 3: UI Admin (IMPORTANTE)
- [ ] Página `/admin/document-schemas`
- [ ] CRUD de schemas
- [ ] Schema builder (formulário visual)
- [ ] Pré-visualização de SQL gerado
- [ ] Teste de classificação

### Sprint 4: UI Usuário (IMPORTANTE)
- [ ] Componente `<SchemaSelector>`
- [ ] Integrar no formulário de upload
- [ ] Preview de campos a extrair
- [ ] Feedback de processamento

### Sprint 5: Inteligência (OPCIONAL)
- [ ] Perfis padrão por organização
- [ ] Cache de preferências do usuário
- [ ] Upload em lote com schema único
- [ ] Reprocessamento com schema diferente

---

## Conclusão

**Nomenclatura Oficial**: Clara e sem ambiguidades  
**Jornada do Usuário**: Intuitiva com auto-detecção + dropdown  
**Flexibilidade**: Admin cria tabelas customizadas conforme necessidade  
**Dual Storage**: Dados estruturados (SQL) + busca semântica (RAG)  
**Escalabilidade**: Sistema comporta infinitos tipos de documentos

**Próximo Passo**: Implementar Sprint 1 (fundação) 🚀

