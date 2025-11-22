# Technical Specifications
## Sistema de Classificação Configurável e Schema Dinâmico

**Versão**: 1.0  
**Data**: 2025-01-22  
**Status**: ✅ Implementado

---

## 1. Visão Técnica Geral

### 1.1. Arquitetura

O sistema foi implementado em 7 fases, seguindo uma arquitetura modular e extensível:

```
┌─────────────────────────────────────────────────────────────┐
│                    Front-end (Next.js)                       │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ Settings Layout  │  │  Classification Config UI    │   │
│  └──────────────────┘  └──────────────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ Schema Config UI │  │  Schema Preview               │   │
│  └──────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ /api/classificat │  │  /api/template-schema/configs │   │
│  │ ion/configs      │  │                                │   │
│  └──────────────────┘  └──────────────────────────────┘   │
│  ┌──────────────────┐                                       │
│  │ /api/classificat │                                       │
│  │ ion/classify     │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ Classification  │  │  Template Schema Service     │   │
│  │ Config Service  │  │                              │   │
│  └──────────────────┘  └──────────────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ Classifier        │  │  Schema Builder               │   │
│  └──────────────────┘  └──────────────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ Content Extract  │  │  Content Truncation          │   │
│  └──────────────────┘  └──────────────────────────────┘   │
│  ┌──────────────────┐                                       │
│  │ Token Estimation  │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                     │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ classification_  │  │  template_schema_configs      │   │
│  │ configs          │  │                                │   │
│  └──────────────────┘  └──────────────────────────────┘   │
│  ┌──────────────────┐                                       │
│  │ templates        │  (metadata JSONB + schema_config_id) │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2. Stack Tecnológico

- **Front-end**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **IA**: OpenAI SDK, Google Generative AI SDK
- **Tokens**: tiktoken
- **Validação**: Zod

---

## 2. Estrutura de Dados

### 2.1. Schema do Banco de Dados

#### Tabela: `classification_configs`

```typescript
{
  id: uuid (PK)
  name: text (NOT NULL)
  system_prompt: text (NOT NULL)
  model_provider: enum('openai', 'google') (NOT NULL)
  model_name: text (NOT NULL)
  max_input_tokens: integer (NOT NULL)
  max_output_tokens: integer (NOT NULL)
  extraction_function_code: text (NULLABLE)
  is_active: boolean (DEFAULT false)
  created_at: timestamp
  updated_at: timestamp
}
```

**Índices**:
- `idx_classification_configs_is_active` (is_active)

#### Tabela: `template_schema_configs`

```typescript
{
  id: uuid (PK)
  name: text (NOT NULL)
  fields: jsonb (NOT NULL) // Array<FieldDefinition>
  is_active: boolean (DEFAULT false)
  created_at: timestamp
  updated_at: timestamp
}
```

**Índices**:
- `idx_template_schema_configs_is_active` (is_active)

#### Tabela: `templates` (Refatorada)

```typescript
{
  id: uuid (PK)
  document_file_id: uuid (FK -> document_files.id)
  title: text (NOT NULL)
  markdown: text (NOT NULL)
  metadata: jsonb // Campos dinâmicos definidos pelo schema
  schema_config_id: uuid (FK -> template_schema_configs.id)
  created_at: timestamp
  updated_at: timestamp
}
```

**Índices**:
- `idx_templates_schema_config_id` (schema_config_id)
- Potenciais índices GIN para campos JSONB frequentemente filtrados

### 2.2. Tipos TypeScript

#### FieldDefinition

```typescript
type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'bigint'
  | 'enum' 
  | 'literal' 
  | 'array' 
  | 'object' 
  | 'union'

interface BaseFieldDefinition {
  name: string
  type: FieldType
  description?: string
  required?: boolean
  defaultValue?: any
}

// Especializações por tipo
interface EnumFieldDefinition extends BaseFieldDefinition {
  type: 'enum'
  enumValues: string[]
}

interface ArrayFieldDefinition extends BaseFieldDefinition {
  type: 'array'
  itemType: FieldType
  itemConfig?: FieldDefinition // Para arrays de objetos
}

interface ObjectFieldDefinition extends BaseFieldDefinition {
  type: 'object'
  objectFields: FieldDefinition[] // Recursivo
}

interface UnionFieldDefinition extends BaseFieldDefinition {
  type: 'union'
  unionTypes: FieldType[]
  unionConfigs?: FieldDefinition[]
}

type FieldDefinition = 
  | BaseFieldDefinition
  | EnumFieldDefinition
  | ArrayFieldDefinition
  | ObjectFieldDefinition
  | UnionFieldDefinition
  | ...
```

#### ClassificationConfig

```typescript
interface ClassificationConfig {
  id: string
  name: string
  systemPrompt: string
  modelProvider: 'openai' | 'google'
  modelName: string
  maxInputTokens: number
  maxOutputTokens: number
  extractionFunctionCode?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### TemplateSchemaConfig

```typescript
interface TemplateSchemaConfig {
  id: string
  name: string
  fields: FieldDefinition[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

## 3. Serviços e Componentes

### 3.1. Classification Config Service

**Arquivo**: `lib/services/classification-config.ts`

**Responsabilidades**:
- CRUD de configurações de classificação
- Validação de limites de tokens baseada no modelo
- Validação de código JavaScript customizado
- Gerenciamento de configuração ativa

**Funções Principais**:
```typescript
async function listClassificationConfigs(): Promise<ClassificationConfig[]>
async function getClassificationConfig(id: string): Promise<ClassificationConfig>
async function createClassificationConfig(data: CreateConfigInput): Promise<ClassificationConfig>
async function updateClassificationConfig(id: string, data: UpdateConfigInput): Promise<ClassificationConfig>
async function deleteClassificationConfig(id: string): Promise<void>
async function getActiveClassificationConfig(): Promise<ClassificationConfig>
async function validateTokenLimits(modelProvider: string, modelName: string, maxInput: number, maxOutput: number): void
async function validateExtractionFunctionCode(code: string): void
```

### 3.2. Template Schema Service

**Arquivo**: `lib/services/template-schema-service.ts`

**Responsabilidades**:
- CRUD de configurações de schema
- Validação de definições de campos
- Gerenciamento de schema ativo

**Funções Principais**:
```typescript
async function listTemplateSchemaConfigs(): Promise<TemplateSchemaConfig[]>
async function getTemplateSchemaConfig(id: string): Promise<TemplateSchemaConfig>
async function createTemplateSchemaConfig(data: CreateSchemaInput): Promise<TemplateSchemaConfig>
async function updateTemplateSchemaConfig(id: string, data: UpdateSchemaInput): Promise<TemplateSchemaConfig>
async function deleteTemplateSchemaConfig(id: string): Promise<void>
async function getActiveTemplateSchemaConfig(): Promise<TemplateSchemaConfig>
async function loadTemplateSchemaConfig(id?: string): Promise<TemplateSchemaConfig>
```

### 3.3. Schema Builder

**Arquivo**: `lib/services/schema-builder.ts`

**Responsabilidades**:
- Geração de schema Zod dinamicamente
- Validação de definições de campos
- Suporte a tipos complexos recursivos

**Funções Principais**:
```typescript
function buildZodSchemaFromConfig(config: TemplateSchemaConfig): z.ZodSchema
function validateFieldDefinition(field: FieldDefinition): ValidationResult
function validateTemplateSchemaConfig(config: TemplateSchemaConfig): ValidationResult
```

**Algoritmo de Construção**:
1. Para cada campo na definição:
   - Identifica o tipo
   - Aplica configurações específicas (min/max, enumValues, etc.)
   - Adiciona validações (required, defaultValue, description)
   - Para tipos complexos (array, object, union), recursivamente constrói sub-schemas
2. Retorna schema Zod completo

### 3.4. Classifier (Refatorado)

**Arquivo**: `lib/services/classifier.ts`

**Responsabilidades**:
- Classificação de documentos usando configuração ativa
- Preparação de conteúdo (extração/truncamento)
- Construção de schema dinâmico

**Funções Principais**:
```typescript
async function loadClassificationConfig(configId?: string): Promise<ClassificationConfig>
async function buildClassificationSchema(schemaConfig: TemplateSchemaConfig): Promise<z.ZodSchema>
async function prepareMarkdownContent(markdown: string, config: ClassificationConfig): Promise<string>
async function classifyDocument(markdown: string, configId?: string, onProgress?: Callback): Promise<ClassificationResult>
```

**Fluxo de Classificação**:
1. Carrega configuração (ativa ou especificada)
2. Carrega schema de template (ativo ou especificado)
3. Constrói schema Zod dinamicamente
4. Prepara conteúdo (extração ou truncamento)
5. Estima tokens e valida limites
6. Chama API de IA com schema dinâmico
7. Valida resposta
8. Retorna resultado

### 3.5. Token Estimation

**Arquivo**: `lib/utils/token-estimation.ts`

**Responsabilidades**:
- Estimativa precisa de tokens usando tiktoken
- Fallback para aproximação

**Funções Principais**:
```typescript
function estimateTokensForClassificationModel(text: string, model: string): number
function estimateTokensApproximate(text: string): number
```

**Algoritmo**:
1. Tenta usar tiktoken com encoding específico do modelo
2. Se falhar, usa cl100k_base (comum para OpenAI/Google)
3. Se ainda falhar, usa aproximação (1 token ≈ 4 caracteres)

### 3.6. Content Extraction

**Arquivo**: `lib/services/content-extraction.ts`

**Responsabilidades**:
- Extração de conteúdo relevante do markdown
- Execução segura de função customizada

**Funções Principais**:
```typescript
function extractClassificationRelevantContent(markdown: string, config?: ExtractionConfig): string
function executeCustomExtractionFunction(code: string, markdown: string): string
```

**Função Padrão**:
- Extrai início (3000 chars)
- Extrai estrutura de seções (H1, H2)
- Extrai fim (3000 chars)

**Validação de Segurança**:
- Bloqueia: require, import, eval, Function, global, process, Buffer, etc.
- Permite apenas operações seguras em strings

### 3.7. Content Truncation

**Arquivo**: `lib/services/content-truncation.ts`

**Responsabilidades**:
- Cálculo de tokens disponíveis
- Decisão entre extração e truncamento
- Truncamento inteligente preservando início e fim

**Funções Principais**:
```typescript
function calculateAvailableTokens(maxInputTokens: number, systemPromptTokens: number, userPromptTokens: number, outputMargin: number): number
function shouldUseExtraction(fullDocTokens: number, availableTokens: number): boolean
function truncateMarkdown(markdown: string, maxTokens: number): string
```

**Algoritmo de Truncamento**:
1. Calcula tokens disponíveis (maxInput - systemPrompt - userPrompt - outputMargin)
2. Se documento cabe, retorna completo
3. Se não cabe, decide entre extração e truncamento direto
4. Trunca mantendo início (40%) e fim (60%)
5. Remove seções intermediárias se necessário

---

## 4. APIs

### 4.1. Classification Config API

**Base Path**: `/api/classification/configs`

#### GET `/api/classification/configs`
Lista todas as configurações.

**Response**:
```json
{
  "configs": [
    {
      "id": "uuid",
      "name": "string",
      "systemPrompt": "string",
      "modelProvider": "openai" | "google",
      "modelName": "string",
      "maxInputTokens": number,
      "maxOutputTokens": number,
      "extractionFunctionCode": "string" | null,
      "isActive": boolean,
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ]
}
```

#### POST `/api/classification/configs`
Cria nova configuração.

**Request Body**:
```json
{
  "name": "string",
  "systemPrompt": "string",
  "modelProvider": "openai" | "google",
  "modelName": "string",
  "maxInputTokens": number,
  "maxOutputTokens": number,
  "extractionFunctionCode": "string" | null,
  "isActive": boolean
}
```

#### GET `/api/classification/configs/[id]`
Obtém configuração específica.

#### PUT `/api/classification/configs/[id]`
Atualiza configuração.

#### DELETE `/api/classification/configs/[id]`
Deleta configuração.

### 4.2. Template Schema API

**Base Path**: `/api/template-schema/configs`

#### GET `/api/template-schema/configs`
Lista todos os schemas.

#### POST `/api/template-schema/configs`
Cria novo schema.

**Request Body**:
```json
{
  "name": "string",
  "fields": [
    {
      "name": "string",
      "type": "string" | "number" | "boolean" | ...,
      "description": "string",
      "required": boolean,
      "defaultValue": any,
      // Configurações específicas por tipo
      "enumValues": ["string"] // para enum
      "min": number, "max": number // para number
      "itemType": "string", "itemConfig": {...} // para array
      "objectFields": [...] // para object
      "unionTypes": [...], "unionConfigs": [...] // para union
    }
  ],
  "isActive": boolean
}
```

#### GET `/api/template-schema/configs/[id]`
Obtém schema específico.

#### PUT `/api/template-schema/configs/[id]`
Atualiza schema.

#### DELETE `/api/template-schema/configs/[id]`
Deleta schema.

### 4.3. Classification API

**Base Path**: `/api/classification/classify`

#### POST `/api/classification/classify`
Classifica documento.

**Request Body**:
```json
{
  "markdown": "string",
  "configId": "uuid" | null, // opcional, usa ativa se não fornecido
  "schemaConfigId": "uuid" | null // opcional, usa ativo se não fornecido
}
```

**Response**:
```json
{
  "result": {
    "docType": "string",
    "area": "string",
    "jurisdiction": "string",
    "complexity": "string",
    "tags": ["string"],
    "summary": "string",
    "qualityScore": number,
    "title": "string",
    "sections": [
      {
        "name": "string",
        "role": "string"
      }
    ]
  }
}
```

---

## 5. Front-end

### 5.1. Estrutura de Páginas

```
app/(dashboard)/settings/
├── page.tsx                    # Página principal com submenu
├── classification/
│   └── page.tsx                # Configuração de classificação
└── template-schema/
    └── page.tsx                # Configuração de schema
```

### 5.2. Componentes

#### SettingsLayout
**Arquivo**: `components/settings/settings-layout.tsx`

Layout com sidebar de navegação entre configurações.

#### ModelSelector
**Arquivo**: `components/settings/model-selector.tsx`

Seletor de provider/modelo com exibição de limites de tokens.

#### CodeEditor
**Arquivo**: `components/settings/code-editor.tsx`

Editor de código JavaScript com preview de função padrão.

#### FieldTypeSelector
**Arquivo**: `components/settings/field-type-selector.tsx`

Seletor de tipo de campo Zod com descrições.

#### SchemaFieldEditor
**Arquivo**: `components/settings/schema-field-editor.tsx`

Editor completo de campo com todas as opções.

#### NestedFieldsEditor
**Arquivo**: `components/settings/nested-fields-editor.tsx`

Editor recursivo de campos aninhados.

#### SchemaPreview
**Arquivo**: `components/settings/schema-preview.tsx`

Preview do schema Zod gerado em tempo real.

---

## 6. Migração de Dados

### 6.1. Estratégia

Migração em 3 etapas:

1. **Migration do Drizzle**: Cria novas tabelas e torna colunas antigas nullable
2. **Script de Migração**: Move dados para JSONB e cria schema padrão
3. **Script de Limpeza**: Remove colunas antigas e enums

### 6.2. Processo

```bash
# Etapa 1: Migration do Drizzle
npm run db:migrate

# Etapa 2: Migrar dados
npm run db:migrate-template-schema

# Etapa 3: Remover colunas antigas
npm run db:remove-old-columns
```

### 6.3. Validação

Após cada etapa:
- Validação de estrutura com MCP Neon
- Validação de dados migrados
- Verificação de integridade

---

## 7. Segurança

### 7.1. Validação de Código JavaScript

**Bloqueios**:
- `require`, `import`, `eval`, `Function`, `global`, `process`, `Buffer`, etc.

**Permitido**:
- Operações em strings (substring, slice, etc.)
- Expressões regulares
- Operações matemáticas básicas

### 7.2. Validação de Entrada

- Validação de tipos em todas as APIs
- Validação de limites de tokens
- Validação de definições de campos

### 7.3. Sandbox

Código JavaScript customizado executado em contexto isolado (sem acesso a Node.js APIs).

---

## 8. Performance

### 8.1. Otimizações

- **Índices**: Índices B-tree para foreign keys e flags ativas
- **JSONB**: Operadores eficientes (`->`, `->>`, `@>`)
- **Queries**: Queries otimizadas para campos JSONB

### 8.2. Potenciais Melhorias

- Índices GIN para campos JSONB frequentemente filtrados
- Cache de schemas Zod gerados
- Cache de configurações ativas

---

## 9. Testes e Validação

### 9.1. Validações Realizadas

- ✅ Estrutura do banco de dados
- ✅ Dados migrados (2365 templates)
- ✅ Funcionalidades implementadas
- ✅ Interface completa
- ✅ APIs funcionais

### 9.2. Testes Manuais

- ✅ CRUD de configurações
- ✅ CRUD de schemas
- ✅ Classificação com diferentes modelos
- ✅ Schema dinâmico funcionando
- ✅ Validação em tempo real

---

## 10. Referências

- [Documentação de Progresso](../implementation-progress/classificacao-configuravel-schema-dinamico.md)
- [Guia de Migração](../implementation-progress/MIGRATION_GUIDE.md)
- [PRD](./PRD-CLASSIFICACAO-CONFIGURAVEL.md)

