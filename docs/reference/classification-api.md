# Referência de API - Classificação Configurável e Schema Dinâmico

Esta documentação descreve todas as APIs relacionadas ao sistema de classificação configurável e schema dinâmico.

---

## Base URLs

- **Desenvolvimento**: `http://localhost:3000`
- **Produção**: (configurar conforme ambiente)

---

## Autenticação

Todas as APIs requerem autenticação via NextAuth.js. Inclua o cookie de sessão nas requisições.

---

## Classification Config API

### Listar Configurações

**GET** `/api/classification/configs`

Lista todas as configurações de classificação.

**Response**:
```json
{
  "configs": [
    {
      "id": "uuid",
      "name": "Classificação GPT-4o",
      "systemPrompt": "Você é um especialista...",
      "modelProvider": "openai",
      "modelName": "gpt-4o",
      "maxInputTokens": 128000,
      "maxOutputTokens": 16384,
      "extractionFunctionCode": "function extract...",
      "isActive": true,
      "createdAt": "2025-01-22T10:00:00Z",
      "updatedAt": "2025-01-22T10:00:00Z"
    }
  ]
}
```

**Status Codes**:
- `200`: Sucesso
- `500`: Erro interno

---

### Obter Configuração

**GET** `/api/classification/configs/[id]`

Obtém uma configuração específica.

**Path Parameters**:
- `id` (string, required): UUID da configuração

**Response**:
```json
{
  "config": {
    "id": "uuid",
    "name": "Classificação GPT-4o",
    "systemPrompt": "Você é um especialista...",
    "modelProvider": "openai",
    "modelName": "gpt-4o",
    "maxInputTokens": 128000,
    "maxOutputTokens": 16384,
    "extractionFunctionCode": "function extract...",
    "isActive": true,
    "createdAt": "2025-01-22T10:00:00Z",
    "updatedAt": "2025-01-22T10:00:00Z"
  }
}
```

**Status Codes**:
- `200`: Sucesso
- `404`: Configuração não encontrada
- `500`: Erro interno

---

### Criar Configuração

**POST** `/api/classification/configs`

Cria uma nova configuração de classificação.

**Request Body**:
```json
{
  "name": "Classificação GPT-4o",
  "systemPrompt": "Você é um especialista em classificação de documentos jurídicos...",
  "modelProvider": "openai",
  "modelName": "gpt-4o",
  "maxInputTokens": 128000,
  "maxOutputTokens": 16384,
  "extractionFunctionCode": "function extractRelevantContent(markdown) { ... }",
  "isActive": false
}
```

**Campos**:
- `name` (string, required): Nome da configuração
- `systemPrompt` (string, required): System prompt para a IA
- `modelProvider` (string, required): "openai" ou "google"
- `modelName` (string, required): Nome do modelo
- `maxInputTokens` (number, required): Limite máximo de tokens de entrada
- `maxOutputTokens` (number, required): Limite máximo de tokens de saída
- `extractionFunctionCode` (string, optional): Código JavaScript da função de extração
- `isActive` (boolean, optional): Se esta é a configuração ativa

**Response**:
```json
{
  "config": {
    "id": "uuid",
    "name": "Classificação GPT-4o",
    ...
  }
}
```

**Status Codes**:
- `201`: Criado com sucesso
- `400`: Validação falhou (limites de tokens inválidos, código JavaScript inválido, etc.)
- `500`: Erro interno

**Erros Comuns**:
- `"Limites de tokens inválidos para o modelo selecionado"`: Os limites excedem as capacidades do modelo
- `"Código JavaScript inválido"`: O código contém funções bloqueadas (require, import, eval, etc.)

---

### Atualizar Configuração

**PUT** `/api/classification/configs/[id]`

Atualiza uma configuração existente.

**Path Parameters**:
- `id` (string, required): UUID da configuração

**Request Body**: (mesmos campos do POST, todos opcionais)

**Response**:
```json
{
  "config": {
    "id": "uuid",
    "name": "Classificação GPT-4o Atualizada",
    ...
  }
}
```

**Status Codes**:
- `200`: Atualizado com sucesso
- `400`: Validação falhou
- `404`: Configuração não encontrada
- `500`: Erro interno

---

### Deletar Configuração

**DELETE** `/api/classification/configs/[id]`

Deleta uma configuração.

**Path Parameters**:
- `id` (string, required): UUID da configuração

**Response**:
```json
{
  "message": "Configuração deletada com sucesso"
}
```

**Status Codes**:
- `200`: Deletado com sucesso
- `404`: Configuração não encontrada
- `400`: Não é possível deletar configuração ativa
- `500`: Erro interno

---

## Template Schema API

### Listar Schemas

**GET** `/api/template-schema/configs`

Lista todos os schemas de template.

**Response**:
```json
{
  "configs": [
    {
      "id": "uuid",
      "name": "Schema Padrão",
      "fields": [
        {
          "name": "docType",
          "type": "enum",
          "enumValues": ["peticao_inicial", "contestacao", ...],
          "required": true,
          "description": "Tipo do documento"
        },
        ...
      ],
      "isActive": true,
      "createdAt": "2025-01-22T10:00:00Z",
      "updatedAt": "2025-01-22T10:00:00Z"
    }
  ]
}
```

**Status Codes**:
- `200`: Sucesso
- `500`: Erro interno

---

### Obter Schema

**GET** `/api/template-schema/configs/[id]`

Obtém um schema específico.

**Path Parameters**:
- `id` (string, required): UUID do schema

**Response**:
```json
{
  "config": {
    "id": "uuid",
    "name": "Schema Padrão",
    "fields": [...],
    "isActive": true,
    ...
  }
}
```

**Status Codes**:
- `200`: Sucesso
- `404`: Schema não encontrado
- `500`: Erro interno

---

### Criar Schema

**POST** `/api/template-schema/configs`

Cria um novo schema de template.

**Request Body**:
```json
{
  "name": "Schema Trabalhista",
  "fields": [
    {
      "name": "docType",
      "type": "enum",
      "enumValues": ["peticao_inicial", "contestacao"],
      "required": true,
      "description": "Tipo do documento"
    },
    {
      "name": "area",
      "type": "enum",
      "enumValues": ["trabalhista"],
      "required": true
    },
    {
      "name": "qualityScore",
      "type": "number",
      "min": 0,
      "max": 100,
      "required": true
    },
    {
      "name": "tags",
      "type": "array",
      "itemType": "string",
      "required": false,
      "defaultValue": []
    }
  ],
  "isActive": false
}
```

**Campos**:
- `name` (string, required): Nome do schema
- `fields` (array, required): Array de definições de campos (não vazio)
- `isActive` (boolean, optional): Se este é o schema ativo

**Estrutura de FieldDefinition**:
- Campos base: `name`, `type`, `description?`, `required?`, `defaultValue?`
- Para enum: `enumValues` (array de strings)
- Para literal: `literalValue` (string | number | boolean)
- Para number: `min?`, `max?`
- Para array: `itemType`, `itemConfig?`
- Para object: `objectFields` (array de FieldDefinition)
- Para union: `unionTypes`, `unionConfigs?`

**Response**:
```json
{
  "config": {
    "id": "uuid",
    "name": "Schema Trabalhista",
    "fields": [...],
    ...
  }
}
```

**Status Codes**:
- `201`: Criado com sucesso
- `400`: Validação falhou (campos inválidos, estrutura incorreta, etc.)
- `500`: Erro interno

**Erros Comuns**:
- `"Campo obrigatório: name (string não vazio)"`: Nome não fornecido ou vazio
- `"Campo obrigatório: fields (array não vazio)"`: Fields não fornecido ou vazio
- `"Definição de campo inválida"`: Estrutura do campo incorreta

---

### Atualizar Schema

**PUT** `/api/template-schema/configs/[id]`

Atualiza um schema existente.

**Path Parameters**:
- `id` (string, required): UUID do schema

**Request Body**: (mesmos campos do POST, todos opcionais)

**Response**:
```json
{
  "config": {
    "id": "uuid",
    "name": "Schema Trabalhista Atualizado",
    "fields": [...],
    ...
  }
}
```

**Status Codes**:
- `200`: Atualizado com sucesso
- `400`: Validação falhou
- `404`: Schema não encontrado
- `500`: Erro interno

---

### Deletar Schema

**DELETE** `/api/template-schema/configs/[id]`

Deleta um schema.

**Path Parameters**:
- `id` (string, required): UUID do schema

**Response**:
```json
{
  "message": "Schema deletado com sucesso"
}
```

**Status Codes**:
- `200`: Deletado com sucesso
- `404`: Schema não encontrado
- `400`: Não é possível deletar schema ativo
- `500`: Erro interno

---

## Classification API

### Classificar Documento

**POST** `/api/classification/classify`

Classifica um documento usando uma configuração de classificação.

**Request Body**:
```json
{
  "markdown": "# Documento\n\nConteúdo do documento em Markdown...",
  "configId": "uuid", // opcional, usa configuração ativa se não fornecido
  "schemaConfigId": "uuid" // opcional, usa schema ativo se não fornecido
}
```

**Campos**:
- `markdown` (string, required): Conteúdo do documento em Markdown
- `configId` (string, optional): UUID da configuração de classificação
- `schemaConfigId` (string, optional): UUID do schema de template

**Response**:
```json
{
  "result": {
    "docType": "peticao_inicial",
    "area": "civil",
    "jurisdiction": "BR",
    "complexity": "medio",
    "tags": ["contrato", "rescisão"],
    "summary": "Petição inicial sobre rescisão de contrato...",
    "qualityScore": 75,
    "title": "Petição Inicial - Rescisão de Contrato",
    "sections": [
      {
        "name": "Dos Fatos",
        "role": "fatos"
      },
      {
        "name": "Do Direito",
        "role": "fundamentacao"
      }
    ]
  }
}
```

**Status Codes**:
- `200`: Classificação bem-sucedida
- `400`: Validação falhou (markdown vazio, classificação retornou dados vazios, etc.)
- `404`: Configuração ou schema não encontrado
- `500`: Erro interno

**Erros Comuns**:
- `"Campo obrigatório: markdown (string)"`: Markdown não fornecido
- `"Markdown não pode estar vazio"`: Markdown vazio
- `"Classificação retornou dados vazios"`: IA retornou resposta inválida
- `"Configuração de classificação não encontrada"`: ConfigId não existe ou não há configuração ativa
- `"Schema de template não encontrado"`: SchemaConfigId não existe ou não há schema ativo

**Notas**:
- Se `configId` não for fornecido, usa a configuração ativa
- Se `schemaConfigId` não for fornecido, usa o schema ativo
- O sistema prepara automaticamente o conteúdo (extração/truncamento) baseado nos limites de tokens
- A resposta é validada contra o schema dinâmico antes de retornar

---

## Exemplos de Uso

### Exemplo 1: Criar e Usar Configuração

```typescript
// 1. Criar configuração
const createResponse = await fetch('/api/classification/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Classificação GPT-4o',
    systemPrompt: 'Você é um especialista...',
    modelProvider: 'openai',
    modelName: 'gpt-4o',
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    isActive: true
  })
});

const { config } = await createResponse.json();

// 2. Classificar documento
const classifyResponse = await fetch('/api/classification/classify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    markdown: '# Documento\n\nConteúdo...',
    configId: config.id
  })
});

const { result } = await classifyResponse.json();
console.log(result);
```

### Exemplo 2: Criar Schema Customizado

```typescript
const schemaResponse = await fetch('/api/template-schema/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Schema Trabalhista',
    fields: [
      {
        name: 'docType',
        type: 'enum',
        enumValues: ['peticao_inicial', 'contestacao'],
        required: true
      },
      {
        name: 'area',
        type: 'enum',
        enumValues: ['trabalhista'],
        required: true
      },
      {
        name: 'qualityScore',
        type: 'number',
        min: 0,
        max: 100,
        required: true
      }
    ],
    isActive: true
  })
});

const { config: schema } = await schemaResponse.json();
```

### Exemplo 3: Usar Schema com Campos Aninhados

```typescript
const schemaResponse = await fetch('/api/template-schema/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Schema com Objetos',
    fields: [
      {
        name: 'metadata',
        type: 'object',
        objectFields: [
          {
            name: 'author',
            type: 'string',
            required: false
          },
          {
            name: 'sections',
            type: 'array',
            itemType: 'object',
            itemConfig: {
              name: 'section',
              type: 'object',
              objectFields: [
                { name: 'name', type: 'string', required: true },
                { name: 'role', type: 'enum', enumValues: ['intro', 'fundamentacao'], required: true }
              ]
            }
          }
        ]
      }
    ]
  })
});
```

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `400` | Validação falhou ou requisição inválida |
| `404` | Recurso não encontrado |
| `500` | Erro interno do servidor |

---

## Limites e Restrições

- **Tamanho do Markdown**: Limitado pelos limites de tokens da configuração
- **Profundidade de Campos Aninhados**: Recomendado máximo de 5 níveis
- **Tamanho do System Prompt**: Limitado pelos limites de tokens do modelo
- **Código JavaScript**: Restrições de segurança (sem require, import, eval, etc.)

---

## Referências

- [Guia de Classificação Configurável](../guides/classificacao-configuravel.md)
- [Guia de Schema Dinâmico](../guides/schema-dinamico.md)
- [Tech Specs](../architecture/TECH-SPECS-CLASSIFICACAO.md)

