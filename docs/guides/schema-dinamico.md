# Guia de Schema Dinâmico de Templates

Este guia explica como usar o sistema de schema dinâmico para configurar os campos dos templates de documentos.

---

## Visão Geral

O sistema de schema dinâmico permite:

- **Campos Configuráveis**: Definir quais campos cada template terá
- **Tipos Flexíveis**: Suporta todos os tipos Zod relevantes
- **Campos Aninhados**: Objetos e arrays de objetos recursivos
- **Validação Automática**: Schema Zod gerado automaticamente
- **Preview em Tempo Real**: Visualizar o schema gerado enquanto edita

---

## Acessando a Configuração

1. Acesse o dashboard
2. No menu lateral, clique em **"Settings"**
3. No submenu, clique em **"Schema de Template"**

Você verá a página de configuração de schema com:
- Lista de schemas existentes
- Botão para criar novo schema
- Editor visual de campos

---

## Criando um Novo Schema

### Passo 1: Informações Básicas

1. Clique em **"Novo Schema"**
2. Preencha o **Nome** do schema (ex: "Schema Padrão", "Schema Trabalhista")

### Passo 2: Adicionar Campos

Para cada campo que você deseja no template:

1. Clique em **"Adicionar Campo"**
2. Preencha as informações básicas:
   - **Nome**: Nome do campo (ex: "docType", "area", "complexity")
   - **Tipo**: Tipo do campo (veja tipos disponíveis abaixo)
   - **Descrição**: Descrição do campo (opcional, mas recomendado)
   - **Obrigatório**: Se o campo é obrigatório ou opcional
   - **Valor Padrão**: Valor padrão (opcional)

3. Configure opções específicas do tipo (veja tipos abaixo)

4. Clique em **"Salvar Campo"**

### Passo 3: Tipos de Campo Disponíveis

#### String

Campo de texto simples.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão

**Exemplo**:
```json
{
  "name": "jurisdiction",
  "type": "string",
  "description": "Jurisdição do documento",
  "required": true,
  "defaultValue": "BR"
}
```

#### Number

Campo numérico com opções de min/max.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão
- **Min**: Valor mínimo (opcional)
- **Max**: Valor máximo (opcional)

**Exemplo**:
```json
{
  "name": "qualityScore",
  "type": "number",
  "description": "Nota de qualidade (0-100)",
  "required": true,
  "min": 0,
  "max": 100
}
```

#### Boolean

Campo booleano (true/false).

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão

**Exemplo**:
```json
{
  "name": "isGold",
  "type": "boolean",
  "description": "Documento é ouro",
  "required": true,
  "defaultValue": false
}
```

#### Date

Campo de data.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão

**Exemplo**:
```json
{
  "name": "createdDate",
  "type": "date",
  "description": "Data de criação",
  "required": false
}
```

#### BigInt

Campo de número inteiro grande.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão

**Exemplo**:
```json
{
  "name": "documentNumber",
  "type": "bigint",
  "description": "Número do documento",
  "required": false
}
```

#### Enum

Campo com lista de valores permitidos.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão
- **Valores do Enum**: Lista de valores permitidos

**Exemplo**:
```json
{
  "name": "docType",
  "type": "enum",
  "description": "Tipo do documento",
  "required": true,
  "enumValues": [
    "peticao_inicial",
    "contestacao",
    "recurso",
    "parecer",
    "contrato",
    "modelo_generico",
    "outro"
  ]
}
```

#### Literal

Campo com valor literal específico.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão
- **Valor Literal**: Valor específico (string, number ou boolean)

**Exemplo**:
```json
{
  "name": "version",
  "type": "literal",
  "description": "Versão do schema",
  "required": true,
  "literalValue": "1.0"
}
```

#### Array

Campo array de valores.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão
- **Tipo do Item**: Tipo dos elementos do array (string, number, object, etc.)
- **Configuração do Item**: Se o item for object, configure os campos do objeto

**Exemplo - Array de Strings**:
```json
{
  "name": "tags",
  "type": "array",
  "description": "Tags do documento",
  "required": false,
  "itemType": "string",
  "defaultValue": []
}
```

**Exemplo - Array de Objetos**:
```json
{
  "name": "sections",
  "type": "array",
  "description": "Seções do documento",
  "required": false,
  "itemType": "object",
  "itemConfig": {
    "name": "section",
    "type": "object",
    "objectFields": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "role",
        "type": "enum",
        "enumValues": ["intro", "fundamentacao", "pedido", "fatos"],
        "required": true
      }
    ]
  }
}
```

#### Object

Campo objeto com campos aninhados.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão
- **Campos do Objeto**: Lista de campos aninhados (recursivo)

**Exemplo**:
```json
{
  "name": "metadata",
  "type": "object",
  "description": "Metadados adicionais",
  "required": false,
  "objectFields": [
    {
      "name": "author",
      "type": "string",
      "required": false
    },
    {
      "name": "source",
      "type": "string",
      "required": false
    }
  ]
}
```

**Nota**: Campos aninhados podem ser de qualquer tipo, incluindo outros objetos (recursivo).

#### Union

Campo que aceita múltiplos tipos.

**Configurações**:
- Nome
- Descrição
- Obrigatório
- Valor Padrão
- **Tipos da Union**: Lista de tipos permitidos
- **Configurações da Union**: Configurações específicas para cada tipo (opcional)

**Exemplo**:
```json
{
  "name": "value",
  "type": "union",
  "description": "Valor que pode ser string ou number",
  "required": true,
  "unionTypes": ["string", "number"]
}
```

### Passo 4: Preview do Schema

Enquanto você edita os campos, o sistema exibe um **Preview do Schema Zod** em tempo real, mostrando como o schema será gerado.

**Exemplo de Preview**:
```typescript
z.object({
  docType: z.enum(["peticao_inicial", "contestacao", ...]),
  area: z.enum(["civil", "trabalhista", ...]),
  complexity: z.enum(["simples", "medio", "complexo"]),
  tags: z.array(z.string()),
  qualityScore: z.number().min(0).max(100),
  isGold: z.boolean(),
  ...
})
```

### Passo 5: Validação

O sistema valida automaticamente:
- Campos obrigatórios preenchidos
- Tipos corretos
- Configurações válidas (enumValues não vazio, min < max, etc.)
- Estrutura recursiva válida

**Mensagens de Erro**:
- Campos com erro são destacados
- Mensagens de erro descritivas aparecem abaixo do campo
- Botão "Salvar" fica desabilitado enquanto houver erros

### Passo 6: Ativar Schema

1. Marque **"Schema Ativo"** se deseja que este seja o schema padrão
2. **Nota**: Apenas um schema pode estar ativo por vez. Ao ativar um, os outros são desativados automaticamente.

### Passo 7: Salvar

1. Clique em **"Salvar"**
2. O sistema valida o schema completo
3. Se válido, o schema é salvo

---

## Editando um Schema

1. Na lista de schemas, clique em **"Editar"** no schema desejado
2. Faça as alterações necessárias
3. **Atenção**: Alterar um schema pode afetar templates existentes que usam esse schema
4. Clique em **"Salvar"**

---

## Deletando um Schema

1. Na lista de schemas, clique em **"Deletar"** no schema desejado
2. Confirme a exclusão no diálogo
3. **Atenção**: 
   - Não é possível deletar o schema ativo. Desative-o primeiro.
   - Templates que usam o schema não serão deletados, mas ficarão sem schema associado.

---

## Schema Padrão

O sistema vem com um **Schema Padrão** pré-configurado com os campos atuais:

- `docType`: Enum (peticao_inicial, contestacao, recurso, etc.)
- `area`: Enum (civil, trabalhista, tributario, etc.)
- `jurisdiction`: String
- `complexity`: Enum (simples, medio, complexo)
- `tags`: Array de strings
- `summary`: String
- `qualityScore`: Number (0-100)
- `isGold`: Boolean
- `isSilver`: Boolean

Este schema foi criado automaticamente durante a migração e está ativo por padrão.

---

## Como o Sistema Funciona

### 1. Geração de Schema Zod

Quando um template precisa ser classificado:

1. O sistema carrega o schema ativo (ou especificado)
2. Constrói um schema Zod dinamicamente baseado nas definições de campos
3. Usa esse schema para validar a resposta da IA

### 2. Armazenamento

Os campos classificados são armazenados no campo `metadata` JSONB da tabela `templates`:

```json
{
  "docType": "peticao_inicial",
  "area": "civil",
  "jurisdiction": "BR",
  "complexity": "medio",
  "tags": ["contrato", "rescisão"],
  "summary": "Petição inicial sobre rescisão de contrato...",
  "qualityScore": 75,
  "isGold": true,
  "isSilver": false
}
```

### 3. Consultas

Para consultar templates com campos dinâmicos, use operadores JSONB:

```sql
-- Buscar por área
SELECT * FROM templates 
WHERE metadata->>'area' = 'civil';

-- Buscar por tipo de documento
SELECT * FROM templates 
WHERE metadata->>'docType' = 'peticao_inicial';

-- Buscar com qualidade alta
SELECT * FROM templates 
WHERE (metadata->>'qualityScore')::numeric > 80;
```

---

## Dicas e Melhores Práticas

### Nomenclatura

- **Use camelCase**: Para nomes de campos (ex: `docType`, `qualityScore`)
- **Seja Descritivo**: Nomes claros facilitam a manutenção
- **Consistência**: Mantenha padrão de nomenclatura

### Tipos

- **Use Enums**: Para valores fixos (docType, area, complexity)
- **Use Strings**: Para valores livres (jurisdiction, summary)
- **Use Numbers**: Para valores numéricos (qualityScore)
- **Use Arrays**: Para listas (tags, sections)

### Validação

- **Campos Obrigatórios**: Marque como obrigatórios apenas se realmente necessário
- **Valores Padrão**: Use valores padrão quando faz sentido
- **Min/Max**: Defina limites para números quando aplicável

### Campos Aninhados

- **Profundidade**: Evite mais de 3-4 níveis de aninhamento
- **Clareza**: Estruturas simples são mais fáceis de usar
- **Performance**: Campos aninhados podem afetar performance de queries

### Migração

- **Backup**: Sempre faça backup antes de alterar schemas
- **Teste**: Teste mudanças em ambiente de desenvolvimento primeiro
- **Comunicação**: Avise usuários sobre mudanças em schemas ativos

---

## Troubleshooting

### Erro: "Campo inválido"

- Verifique se todas as configurações obrigatórias estão preenchidas
- Verifique se enumValues não está vazio (para enum)
- Verifique se min < max (para number)

### Erro: "Schema não pode ser salvo"

- Verifique se não há erros de validação nos campos
- Verifique se o nome do schema não está vazio
- Verifique se há pelo menos um campo definido

### Preview não atualiza

- Recarregue a página
- Verifique se não há erros de JavaScript no console

### Templates não classificam corretamente

- Verifique se o schema está ativo
- Verifique se o schema tem todos os campos necessários
- Verifique se a configuração de classificação está correta

---

## Referências

- [Tech Specs](../architecture/TECH-SPECS-CLASSIFICACAO.md)
- [PRD](../architecture/PRD-CLASSIFICACAO-CONFIGURAVEL.md)
- [API Reference](../reference/classification-api.md)
- [Guia de Classificação Configurável](./classificacao-configuravel.md)

