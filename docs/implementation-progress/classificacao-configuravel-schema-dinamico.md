# Sistema de Classificação Configurável e Schema Dinâmico - Progresso

Este documento rastreia o progresso da implementação do sistema de classificação configurável e schema dinâmico de templates.

## Status Geral

- **Fase 1**: ✅ Concluída - Banco de Dados e Schema
- **Fase 2**: ✅ Concluída - Backend - Classificação Refatorada
- **Fase 3**: ✅ Concluída - Schema Dinâmico de Templates
- **Fase 4**: ✅ Concluída - APIs Backend
- **Fase 5**: ✅ Concluída - Front-end - Configuração
- **Fase 6**: ⏳ Pendente - Adaptações e Migrações
- **Fase 7**: ⏳ Pendente - Dependências e Setup

---

## Fase 1: Banco de Dados e Schema

### Status: ✅ Concluída

### Objetivos
- Criar novas tabelas: `classification_configs`, `template_schema_configs`
- Refatorar tabela `templates` para usar JSONB em vez de colunas fixas
- Criar schema padrão inicial com campos atuais (docType, area, jurisdiction, etc.)
- Migrar dados existentes para nova estrutura
- Validar migração com MCP Neon

### Arquivos Criados/Modificados

#### Criados:
- `scripts/migrate-template-schema.ts` - Script de migração de dados
- `scripts/remove-old-template-columns.ts` - Script para remover colunas antigas
- `docs/implementation-progress/MIGRATION_GUIDE.md` - Guia de migração

#### Modificados:
- `lib/db/schema/rag.ts` - Adicionadas novas tabelas e refatorada tabela templates
- `package.json` - Adicionados scripts de migração

### Funcionalidades
- [x] Nova tabela `classification_configs` (criada e validada)
- [x] Nova tabela `template_schema_configs` (criada e validada)
- [x] Coluna `metadata` JSONB na tabela `templates` (mantida)
- [x] Coluna `schema_config_id` na tabela `templates` (adicionada e validada)
- [x] Migration gerada com Drizzle ORM (`0002_chubby_big_bertha.sql`)
- [x] Script de migração de dados criado
- [x] Script para remover colunas antigas criado
- [x] Schema padrão inicial criado (ID: `1fb32e40-27c2-431a-9c3b-ded0787b18e6`)
- [x] Migração de dados existentes para JSONB (2365 templates migrados)
- [x] Remoção de colunas antigas (doc_type, area, jurisdiction, complexity, tags, summary, quality_score, is_gold, is_silver)
- [x] Remoção de enums antigos (doc_type, area, complexity)
- [x] Schema do Drizzle atualizado (colunas antigas removidas)

### Validações
- [x] Validação de estrutura com MCP Neon antes da migration
- [x] Validação de estrutura com MCP Neon após a migration
- [x] Validação de dados migrados com queries SELECT via MCP Neon
- [x] Validação do schema padrão criado
- [x] Validação final da estrutura (tabela templates refatorada)

### Decisões Técnicas

1. **Estratégia de Migração em 3 Etapas**:
   - Etapa 1: Migration do Drizzle cria novas tabelas e torna colunas antigas nullable
   - Etapa 2: Script de migração de dados move dados para JSONB e cria schema padrão
   - Etapa 3: Script remove colunas antigas e enums não utilizados

2. **Schema Temporário**:
   - Colunas antigas mantidas no schema temporariamente (nullable) para permitir migração
   - Serão removidas após migração de dados

3. **Schema Padrão Inicial**:
   - Criado via script de migração (não na migration SQL)
   - Inclui todos os campos atuais: docType, area, jurisdiction, complexity, tags, summary, qualityScore, isGold, isSilver

### Resultados da Migração

**Executado em:** 2025-11-22

**Estatísticas:**
- Total de templates migrados: **2365**
- Templates com metadata: **2365** (100%)
- Templates com schema_config_id: **2365** (100%)
- Schema padrão criado: **1fb32e40-27c2-431a-9c3b-ded0787b18e6**

**Estrutura Final da Tabela `templates`:**
- `id` (uuid, PK)
- `document_file_id` (uuid, FK)
- `title` (text)
- `markdown` (text)
- `metadata` (jsonb) - Todos os campos configuráveis
- `schema_config_id` (uuid, FK para template_schema_configs)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Tabelas Criadas:**
- `classification_configs` - Configurações de classificação
- `template_schema_configs` - Schemas de templates configuráveis

**Validações Realizadas:**
- ✅ Estrutura antes da migration validada
- ✅ Migration executada com sucesso
- ✅ Estrutura após migration validada
- ✅ Dados migrados corretamente (todos os templates têm metadata e schema_config_id)
- ✅ Schema padrão criado e validado
- ✅ Colunas antigas removidas
- ✅ Enums não utilizados removidos
- ✅ Estrutura final validada

### Próximos Passos

1. ✅ Fase 1 concluída
2. Iniciar Fase 2: Backend - Classificação Refatorada

### Notas Técnicas
- Migrations geradas com Drizzle ORM (`npm run db:generate`)
- MCP Neon usado apenas para validações e verificações
- Schema padrão criado via script de migração (não na migration SQL)
- Processo de migração documentado em `MIGRATION_GUIDE.md`

---

## Fase 2: Backend - Classificação Refatorada

### Status: ✅ Concluída

### Objetivos
- Sistema de modelos configurável
- Estimativa de tokens com tiktoken
- Funções de extração configuráveis
- Truncamento inteligente baseado em limites de tokens
- Classificador refatorado com funções menores
- Serviço de configuração de classificação

### Arquivos Criados

#### Criados:
- `lib/types/classification-models.ts` - Sistema de modelos para classificação
- `lib/utils/token-estimation.ts` - Estimativa de tokens com tiktoken
- `lib/services/content-extraction.ts` - Funções de extração de conteúdo
- `lib/services/content-truncation.ts` - Lógica de truncamento inteligente
- `lib/services/classification-config.ts` - CRUD de configurações de classificação

#### Modificados:
- `lib/services/classifier.ts` - Refatoração completa usando novos módulos
- `package.json` - tiktoken já estava instalado

### Funcionalidades
- [x] Sistema de modelos com suporte a múltiplos providers (OpenAI e Google)
- [x] Estimativa de tokens com tiktoken (com fallback para aproximação)
- [x] Função de extração padrão (extrai partes relevantes do markdown)
- [x] Sistema para executar função customizada do banco (com validação de segurança)
- [x] Lógica de truncamento inteligente (baseado em limites de tokens do modelo)
- [x] Classificador refatorado com funções menores e responsabilidades únicas
- [x] CRUD de configurações de classificação (create, read, update, delete, list)

### Decisões Técnicas

1. **Reutilização do ChatModel enum**:
   - `ClassificationModel` é um type alias de `ChatModel`
   - Função `getClassificationModelProvider()` similar ao chat
   - Mapeamento de limites de tokens por modelo

2. **Estimativa de Tokens**:
   - Usa tiktoken para modelos OpenAI (preciso)
   - Fallback para cl100k_base para modelos Google (aproximação)
   - Fallback adicional para aproximação (1 token ≈ 4 caracteres) se tiktoken falhar

3. **Funções de Extração**:
   - Função padrão extrai: início (3000 chars), estrutura de seções, fim (3000 chars)
   - Suporte a função customizada via código JavaScript (com validação de segurança)
   - Validação rigorosa de código antes de executar (bloqueia require, import, eval, etc.)

4. **Truncamento Inteligente**:
   - Calcula tokens disponíveis considerando system prompt, user prompt e margem para output
   - Decide automaticamente entre extração e truncamento direto
   - Mantém início e fim do documento ao truncar

5. **Classificador Refatorado**:
   - `loadClassificationConfig()` - Carrega configuração do banco
   - `buildClassificationSchema()` - Constrói schema Zod (preparado para Fase 3)
   - `prepareMarkdownContent()` - Prepara conteúdo (extração/truncamento)
   - `classifyDocument()` - Classifica documento (função principal)
   - Cada função com responsabilidade única

6. **Serviço de Configuração**:
   - Validação de limites de tokens baseada no modelo
   - Validação de código JavaScript customizado
   - Suporte a configuração ativa (apenas uma por vez)
   - CRUD completo com validações

### Próximos Passos

1. ✅ Fase 2 concluída
2. Iniciar Fase 3: Schema Dinâmico de Templates

### Notas Técnicas
- Reutiliza `ChatModel` enum existente
- tiktoken instalado e funcionando
- Fallback para aproximação se tiktoken falhar
- Validação rigorosa de código JavaScript customizado (sandbox seguro)
- Classificador mantém compatibilidade com código existente (mesma interface pública)

---

## Fase 3: Schema Dinâmico de Templates

### Status: ✅ Concluída

### Objetivos
- Tipos e interfaces para schema dinâmico
- Geração de schema Zod dinâmico
- Adaptação de queries para campos JSONB
- Serviço de schema de templates

### Arquivos Criados

#### Criados:
- `lib/types/template-schema.ts` - Tipos e interfaces para schema dinâmico
- `lib/services/schema-builder.ts` - Geração de schema Zod dinâmico
- `lib/services/template-queries.ts` - Queries adaptadas para campos JSONB
- `lib/services/template-schema-service.ts` - CRUD de configurações de schema

#### Modificados:
- `lib/types/template-document.ts` - Adaptado para suportar campos dinâmicos
- `lib/services/classifier.ts` - Atualizado para usar schema dinâmico

### Funcionalidades
- [x] Tipos Zod completos (string, number, boolean, date, bigint, enum, literal, union, array, object)
- [x] Geração de schema Zod baseado em definições de campos
- [x] Queries adaptadas para campos JSONB
- [x] CRUD de configurações de schema
- [x] Validação de definições de campos
- [x] Suporte a campos aninhados (objetos, arrays de objetos)
- [x] Suporte a unions com múltiplos tipos
- [x] Funções auxiliares para trabalhar com campos JSONB

### Decisões Técnicas

1. **Tipos de Campo Suportados**:
   - Primitivos: string, number (com min/max), boolean, date, bigint
   - Enum: z.enum([...]) com lista de valores
   - Literal: z.literal(value) com valor específico
   - Array: z.array(schema) com suporte a arrays de primitivos e objetos
   - Object: z.object({...}) com campos aninhados recursivos
   - Union: z.union([...]) com múltiplos tipos

2. **Geração de Schema Zod**:
   - Função `buildZodSchemaFromConfig()` constrói schema dinamicamente
   - Suporta campos obrigatórios/opcionais
   - Suporta valores padrão
   - Suporta descrições para documentação
   - Validação recursiva para tipos complexos

3. **Queries JSONB**:
   - Função `findTemplatesWithFilters()` para buscar templates com filtros em JSONB
   - Suporte a filtros em campos migrados (area, docType, complexity, etc.)
   - Suporte a filtros customizados em qualquer campo JSONB
   - Funções auxiliares para extrair/atualizar campos específicos

4. **Serviço de Schema**:
   - CRUD completo de configurações de schema
   - Validação antes de salvar
   - Suporte a schema ativo (apenas um por vez)
   - Carregamento de schema padrão se não especificado

5. **Classificador Atualizado**:
   - Função `buildClassificationSchema()` agora é assíncrona
   - Carrega schema dinâmico do banco
   - Fallback para schema fixo se não conseguir carregar schema dinâmico
   - Mantém compatibilidade com código existente

6. **Template Document**:
   - Mantido schema fixo para compatibilidade
   - Adicionadas funções de conversão para formato dinâmico
   - Suporte a campos dinâmicos via metadata JSONB

### Próximos Passos

1. ✅ Fase 3 concluída
2. Iniciar Fase 4: APIs Backend

### Notas Técnicas
- Suporte completo a todos os tipos Zod relevantes
- Validação de tipos e enums
- Suporte a .describe() para documentação de campos
- Queries JSONB otimizadas usando operadores PostgreSQL (->, ->>, @>)
- Schema dinâmico carregado do banco na classificação
- Fallback para schema fixo garante compatibilidade

---

## Fase 4: APIs Backend

### Status: ✅ Concluída

### Objetivos
- API de configuração de classificação
- API de schema de template
- Atualizar API de classificação

### Arquivos Criados

#### Criados:
- `app/api/classification/configs/route.ts` - GET/POST para configurações de classificação
- `app/api/classification/configs/[id]/route.ts` - GET/PUT/DELETE para configuração específica
- `app/api/classification/classify/route.ts` - POST para classificar documento
- `app/api/template-schema/configs/route.ts` - GET/POST para schemas de template
- `app/api/template-schema/configs/[id]/route.ts` - GET/PUT/DELETE para schema específico

### Funcionalidades
- [x] GET/POST para configurações de classificação
- [x] GET/PUT/DELETE para configuração específica
- [x] GET/POST para schemas de template
- [x] GET/PUT/DELETE para schema específico
- [x] POST para classificar documento com configId opcional

### Decisões Técnicas

1. **Estrutura de APIs REST**:
   - Segue padrão RESTful com métodos HTTP apropriados
   - Validação de entrada em todas as rotas
   - Tratamento de erros consistente com códigos HTTP apropriados
   - Mensagens de erro descritivas

2. **API de Classificação**:
   - `GET /api/classification/configs` - Lista todas as configurações
   - `POST /api/classification/configs` - Cria nova configuração
   - `GET /api/classification/configs/[id]` - Obtém configuração específica
   - `PUT /api/classification/configs/[id]` - Atualiza configuração
   - `DELETE /api/classification/configs/[id]` - Deleta configuração
   - `POST /api/classification/classify` - Classifica documento (aceita configId opcional)

3. **API de Schema de Template**:
   - `GET /api/template-schema/configs` - Lista todos os schemas
   - `POST /api/template-schema/configs` - Cria novo schema
   - `GET /api/template-schema/configs/[id]` - Obtém schema específico
   - `PUT /api/template-schema/configs/[id]` - Atualiza schema
   - `DELETE /api/template-schema/configs/[id]` - Deleta schema

4. **Validação e Tratamento de Erros**:
   - Validação de campos obrigatórios
   - Validação de tipos de dados
   - Erros 400 para validação
   - Erros 404 para recursos não encontrados
   - Erros 500 para erros internos
   - Mensagens de erro descritivas

5. **Integração com Serviços**:
   - Usa serviços criados nas fases anteriores
   - `classification-config.ts` para CRUD de configurações
   - `template-schema-service.ts` para CRUD de schemas
   - `classifier.ts` para classificação de documentos

### Próximos Passos

1. ✅ Fase 4 concluída
2. Iniciar Fase 5: Front-end - Configuração

### Notas Técnicas
- APIs seguem padrão RESTful
- Validação de entrada em todas as rotas
- Tratamento de erros consistente
- Integração completa com serviços backend
- Prontas para consumo pelo front-end

---

## Fase 5: Front-end - Configuração

### Status: ✅ Concluída

### Objetivos
- Página principal de settings com submenu
- Página de configuração de classificação
- Página de schema de template
- Componentes reutilizáveis

### Arquivos Criados

#### Criados:
- `app/(dashboard)/settings/page.tsx` - Página principal de settings
- `app/(dashboard)/settings/classification/page.tsx` - Página de configuração de classificação
- `app/(dashboard)/settings/template-schema/page.tsx` - Página de schema de template
- `components/settings/settings-layout.tsx` - Layout com submenu de navegação
- `components/settings/code-editor.tsx` - Editor de código JavaScript
- `components/settings/model-selector.tsx` - Seletor de provider/modelo
- `components/settings/field-type-selector.tsx` - Seletor de tipo de campo Zod
- `components/settings/schema-field-editor.tsx` - Editor de campo individual
- `components/settings/schema-preview.tsx` - Preview do schema Zod gerado

#### Modificados:
- `components/layout/sidebar.tsx` - Adicionado item Settings no menu

### Funcionalidades
- [x] Página principal de settings com submenu
- [x] Formulário de configuração de classificação (CRUD completo)
- [x] Editor de schema de template com tipos Zod principais
- [x] Preview do schema Zod em tempo real
- [x] Componentes reutilizáveis para configuração
- [x] Seletor de modelo com exibição de limites de tokens
- [x] Editor de código JavaScript com preview de função padrão
- [x] Editor de campos com suporte a tipos: string, number, boolean, date, bigint, enum, literal, array
- [x] Validação de formulários
- [x] Confirmação de exclusão com dialogs

### Decisões Técnicas

1. **Layout de Settings**:
   - Layout com sidebar de navegação lateral
   - Navegação entre Classificação e Schema de Template
   - Design responsivo

2. **Página de Classificação**:
   - Formulário completo para criar/editar configurações
   - Lista de configurações existentes
   - Seletor de modelo com limites de tokens
   - Editor de código JavaScript com função padrão
   - Suporte a configuração ativa

3. **Página de Schema de Template**:
   - Editor visual de campos
   - Suporte a tipos principais (string, number, boolean, date, bigint, enum, literal, array)
   - Preview em tempo real do schema Zod gerado
   - Adicionar/remover campos dinamicamente
   - Configurações específicas por tipo (min/max para number, enumValues para enum, etc.)

4. **Componentes Reutilizáveis**:
   - `ModelSelector`: Exibe modelos disponíveis e limites de tokens
   - `CodeEditor`: Editor de código com preview de função padrão
   - `FieldTypeSelector`: Seletor de tipo com descrições
   - `SchemaFieldEditor`: Editor completo de campo com todas as opções
   - `SchemaPreview`: Preview do schema Zod gerado

5. **UX/UI**:
   - Feedback visual com toasts
   - Confirmação de exclusão com dialogs
   - Estados de loading
   - Validação de formulários
   - Scroll automático ao editar

### Limitações Conhecidas

- ~~Arrays de objetos requerem configuração adicional (não totalmente suportado na UI básica)~~ ✅ **RESOLVIDO**
- ~~Objetos aninhados requerem configuração adicional (não totalmente suportado na UI básica)~~ ✅ **RESOLVIDO**
- ~~Unions requerem configuração adicional (não totalmente suportado na UI básica)~~ ✅ **RESOLVIDO**

Todas as limitações foram resolvidas com a implementação do suporte completo a tipos complexos (ver seção abaixo).

### Suporte Completo a Tipos Complexos - Implementado

**Status**: ✅ Concluído

**Data**: 2025-01-22

#### Objetivos
- Adicionar suporte completo na UI para arrays de objetos
- Adicionar suporte completo na UI para objetos aninhados recursivamente
- Adicionar suporte completo na UI para unions com configurações específicas
- Melhorar validação em tempo real e feedback visual

#### Arquivos Criados
- `components/settings/nested-fields-editor.tsx` - Editor recursivo de campos aninhados

#### Arquivos Modificados
- `components/settings/schema-field-editor.tsx` - Suporte completo a tipos complexos
- `components/settings/schema-preview.tsx` - Preview melhorado para tipos complexos recursivos
- `app/(dashboard)/settings/template-schema/page.tsx` - Validação em tempo real

#### Funcionalidades Implementadas
- [x] Componente `NestedFieldsEditor` para editar campos aninhados recursivamente
- [x] Suporte a arrays de objetos com configuração de `itemConfig`
- [x] Suporte a objetos aninhados com edição recursiva de `objectFields`
- [x] Suporte a unions com `unionTypes` e `unionConfigs` opcionais
- [x] Validação em tempo real com feedback visual (badges, mensagens de erro)
- [x] Preview do schema Zod completo mostrando estrutura recursiva
- [x] Botão de salvar desabilitado quando há erros de validação
- [x] Indentação visual para indicar níveis de aninhamento
- [x] Limite de profundidade configurável (5 níveis)

#### Decisões Técnicas
1. **Editor Recursivo**: Componente `NestedFieldsEditor` reutilizável que renderiza `SchemaFieldEditor` para cada campo
2. **Type Guards**: Uso de type guards (`isObjectField`, `isArrayField`, etc.) para garantir type safety
3. **Validação em Tempo Real**: Integração com `validateFieldDefinition` e `validateTemplateSchemaConfig` do schema-builder
4. **UX Melhorada**: Badges, mensagens de erro inline, e feedback visual claro
5. **Preview Recursivo**: Função `formatFieldDefinition` recursiva para gerar preview completo do schema

#### Notas Técnicas
- Interface intuitiva e responsiva usando shadcn UI e Tailwind CSS
- Componentes reutilizáveis e modulares
- Validação de formulários no front-end com feedback em tempo real
- Integração completa com APIs criadas na Fase 4
- Preview em tempo real do schema Zod com suporte completo a tipos complexos
- Suporte a todos os tipos Zod relevantes (string, number, boolean, date, bigint, enum, literal, array, object, union)

### Próximos Passos

1. ✅ Fase 5 concluída
2. ✅ Suporte completo a tipos complexos implementado
3. Iniciar Fase 6: Adaptações e Migrações

---

## Fase 6: Adaptações e Migrações

### Status: ⏳ Pendente

### Objetivos
- Atualizar scripts existentes
- Atualizar front-end existente
- Atualizar RAG Search e Chat

### Arquivos a Modificar
- `scripts/classify-documents.ts`
- `app/(dashboard)/files/[id]/page.tsx`
- `app/(dashboard)/files/page.tsx`
- `components/files/file-list.tsx`
- `lib/services/rag-search.ts`
- `lib/services/rag-chat.ts`

### Funcionalidades
- [ ] Script de classificação atualizado
- [ ] Exibição de campos dinâmicos no front-end
- [ ] Filtros adaptados para campos JSONB
- [ ] RAG Search adaptado para JSONB
- [ ] RAG Chat adaptado para campos dinâmicos

---

## Fase 7: Dependências e Setup

### Status: ⏳ Pendente

### Objetivos
- Instalar dependências necessárias
- Finalizar validações

### Tarefas
- [ ] Instalar `tiktoken`
- [ ] Validações finais com MCP Neon
- [ ] Testes de integração

---

## Notas Gerais

- **Migrations**: Sempre geradas com Drizzle ORM (`npm run db:generate`)
- **MCP Neon**: Usado apenas para validações e verificações
- **Documentação**: Atualizar este arquivo a cada fase concluída

