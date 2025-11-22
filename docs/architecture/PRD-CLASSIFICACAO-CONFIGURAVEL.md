# Product Requirements Document (PRD)
## Sistema de Classificação Configurável e Schema Dinâmico

**Versão**: 1.0  
**Data**: 2025-01-22  
**Status**: ✅ Implementado

---

## 1. Visão Geral

### 1.1. Objetivo

Implementar um sistema flexível e configurável para classificação de documentos jurídicos, permitindo:

1. **Classificação Configurável**: Suporte a múltiplos providers/modelos de IA com configuração via interface web
2. **Schema Dinâmico**: Templates com campos configuráveis definidos pelo usuário
3. **Extensibilidade**: Sistema preparado para evoluir sem mudanças no código

### 1.2. Problema a Resolver

**Problema Atual**:
- Classificação hardcoded com modelo único (GPT-4o)
- Schema de templates fixo no código (docType, area, complexity, etc.)
- Impossível adicionar novos campos sem alterar código
- Impossível usar diferentes modelos/providers sem alterar código
- Limites de tokens aproximados (não precisos)

**Solução Proposta**:
- Sistema de configuração via interface web
- Schema de templates definido dinamicamente
- Suporte a múltiplos providers (OpenAI, Google/Gemini)
- Estimativa precisa de tokens com tiktoken
- Funções de extração customizáveis

### 1.3. Público-Alvo

- **Usuários Finais**: Administradores do sistema que precisam configurar classificação
- **Desenvolvedores**: Equipe que precisa entender e manter o sistema
- **Usuários do Sistema**: Usuários que se beneficiam de templates com campos dinâmicos

---

## 2. Requisitos Funcionais

### 2.1. Classificação Configurável

#### RF-001: Configuração de Classificação
- **Prioridade**: Alta
- **Descrição**: Sistema deve permitir criar, editar, listar e deletar configurações de classificação
- **Critérios de Aceitação**:
  - Interface web para CRUD completo
  - Campos: nome, system prompt, provider, modelo, limites de tokens
  - Suporte a função de extração customizada (JavaScript)
  - Apenas uma configuração ativa por vez
  - Validação de limites de tokens baseada no modelo

#### RF-002: Múltiplos Providers
- **Prioridade**: Alta
- **Descrição**: Sistema deve suportar OpenAI e Google/Gemini
- **Critérios de Aceitação**:
  - Seletor de provider na interface
  - Lista de modelos disponíveis por provider
  - Exibição de limites de tokens por modelo
  - Integração funcional com ambos os providers

#### RF-003: Estimativa de Tokens
- **Prioridade**: Alta
- **Descrição**: Sistema deve usar tiktoken para estimativa precisa
- **Critérios de Aceitação**:
  - Estimativa precisa para modelos OpenAI
  - Fallback para aproximação para modelos Google
  - Fallback adicional se tiktoken falhar

#### RF-004: Função de Extração Customizada
- **Prioridade**: Média
- **Descrição**: Sistema deve permitir função JavaScript customizada para extrair conteúdo
- **Critérios de Aceitação**:
  - Editor de código JavaScript na interface
  - Validação de segurança (bloqueia require, import, eval, etc.)
  - Função padrão disponível como referência
  - Execução segura em sandbox

#### RF-005: Truncamento Inteligente
- **Prioridade**: Alta
- **Descrição**: Sistema deve truncar documentos baseado em limites de tokens do modelo
- **Critérios de Aceitação**:
  - Calcula tokens disponíveis considerando system prompt, user prompt e margem
  - Decide automaticamente entre extração e truncamento direto
  - Preserva início e fim do documento ao truncar

### 2.2. Schema Dinâmico de Templates

#### RF-006: Configuração de Schema
- **Prioridade**: Alta
- **Descrição**: Sistema deve permitir criar, editar, listar e deletar schemas de template
- **Critérios de Aceitação**:
  - Interface web para CRUD completo
  - Editor visual de campos
  - Preview em tempo real do schema Zod gerado
  - Apenas um schema ativo por vez

#### RF-007: Tipos de Campo Completos
- **Prioridade**: Alta
- **Descrição**: Sistema deve suportar todos os tipos Zod relevantes
- **Critérios de Aceitação**:
  - Primitivos: string, number, boolean, date, bigint
  - Enum: com lista de valores
  - Literal: com valor específico
  - Array: com tipo de item configurável (primitivo ou objeto)
  - Object: com campos aninhados recursivos
  - Union: com múltiplos tipos

#### RF-008: Campos Aninhados
- **Prioridade**: Média
- **Descrição**: Sistema deve suportar objetos e arrays de objetos aninhados
- **Critérios de Aceitação**:
  - Editor recursivo para campos aninhados
  - Validação recursiva
  - Preview completo da estrutura
  - Limite de profundidade configurável (5 níveis)

#### RF-009: Validação de Schema
- **Prioridade**: Alta
- **Descrição**: Sistema deve validar definições de campos antes de salvar
- **Critérios de Aceitação**:
  - Validação em tempo real na interface
  - Mensagens de erro descritivas
  - Botão de salvar desabilitado quando há erros

#### RF-010: Migração de Dados
- **Prioridade**: Alta
- **Descrição**: Sistema deve migrar dados existentes para novo formato
- **Critérios de Aceitação**:
  - Migração de colunas fixas para JSONB
  - Schema padrão criado com campos atuais
  - Todos os templates migrados (2365 templates)
  - Validação de integridade dos dados

### 2.3. Interface Web

#### RF-011: Página de Configuração
- **Prioridade**: Alta
- **Descrição**: Página principal de settings com submenu
- **Critérios de Aceitação**:
  - Layout com sidebar de navegação
  - Submenu "Classificação" e "Schema de Template"
  - Navegação entre submenus mantendo contexto
  - Item "Settings" no menu principal

#### RF-012: Interface de Classificação
- **Prioridade**: Alta
- **Descrição**: Interface completa para configurar classificação
- **Critérios de Aceitação**:
  - Lista de configurações existentes
  - Formulário para criar/editar
  - Editor de system prompt
  - Seletor de modelo com limites de tokens
  - Editor de código JavaScript
  - Preview de função padrão

#### RF-013: Interface de Schema
- **Prioridade**: Alta
- **Descrição**: Interface completa para configurar schema de template
- **Critérios de Aceitação**:
  - Lista de schemas existentes
  - Editor visual de campos
  - Seletor de tipo com descrições
  - Configurações específicas por tipo
  - Preview do schema Zod em tempo real
  - Validação visual

---

## 3. Requisitos Não-Funcionais

### 3.1. Performance

- **RNF-001**: Classificação deve processar documentos em tempo razoável (< 30s para documentos médios)
- **RNF-002**: Interface deve responder em < 500ms para operações CRUD
- **RNF-003**: Preview de schema deve atualizar em tempo real sem lag perceptível

### 3.2. Segurança

- **RNF-004**: Código JavaScript customizado deve ser validado antes de executar
- **RNF-005**: Bloquear acesso a require, import, eval, etc.
- **RNF-006**: Validação de entrada em todas as APIs

### 3.3. Usabilidade

- **RNF-007**: Interface intuitiva e responsiva
- **RNF-008**: Feedback visual claro (toasts, loading states)
- **RNF-009**: Mensagens de erro descritivas
- **RNF-010**: Confirmação para ações destrutivas

### 3.4. Compatibilidade

- **RNF-011**: Manter compatibilidade com código legado durante transição
- **RNF-012**: Fallback para schema fixo se schema dinâmico não disponível
- **RNF-013**: Migração reversível (com backup)

### 3.5. Manutenibilidade

- **RNF-014**: Código refatorado em funções menores
- **RNF-015**: Documentação completa
- **RNF-016**: Testes de validação após migração

---

## 4. Escopo

### 4.1. Incluído

- ✅ Sistema de configuração de classificação
- ✅ Schema dinâmico de templates
- ✅ Interface web completa
- ✅ Migração de dados existentes
- ✅ Suporte a múltiplos providers
- ✅ Estimativa precisa de tokens
- ✅ Função de extração customizada
- ✅ Truncamento inteligente
- ✅ Validação de schema em tempo real
- ✅ Preview de schema Zod

### 4.2. Não Incluído (Futuro)

- ⏳ Histórico de versões de configurações
- ⏳ Testes A/B de configurações
- ⏳ Exportação/importação de configurações
- ⏳ Templates de configuração pré-definidos
- ⏳ Análise de performance de configurações
- ⏳ Índices GIN automáticos para campos JSONB

---

## 5. Métricas de Sucesso

### 5.1. Técnicas

- ✅ 100% dos templates migrados (2365/2365)
- ✅ 0 erros de validação após migração
- ✅ Tempo de classificação mantido (< 30s)
- ✅ Interface responsiva (< 500ms)

### 5.2. Funcionais

- ✅ Configurações de classificação funcionais
- ✅ Schemas dinâmicos funcionais
- ✅ Interface completa e intuitiva
- ✅ Validação em tempo real funcionando

---

## 6. Riscos e Mitigações

### 6.1. Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Migração de dados falhar | Baixa | Alto | Backup completo, validação após cada etapa |
| Performance degradar | Média | Médio | Índices JSONB, otimização de queries |
| Código JavaScript inseguro | Baixa | Alto | Validação rigorosa, sandbox seguro |

### 6.2. Riscos de Negócio

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Usuários não entenderem interface | Média | Médio | Documentação, guias, exemplos |
| Configurações incorretas | Média | Médio | Validação, preview, testes |

---

## 7. Roadmap

### Fase 1: Banco de Dados ✅
- Criar novas tabelas
- Migrar dados existentes
- Validar migração

### Fase 2: Backend ✅
- Refatorar classificador
- Sistema de modelos
- Estimativa de tokens
- Truncamento inteligente

### Fase 3: Schema Dinâmico ✅
- Tipos e interfaces
- Geração de schema Zod
- Serviço de schema

### Fase 4: APIs ✅
- APIs de configuração
- APIs de schema
- API de classificação

### Fase 5: Front-end ✅
- Página de settings
- Interface de classificação
- Interface de schema

### Fase 6: Adaptações ✅
- Atualizar scripts
- Atualizar front-end existente
- Atualizar RAG Search/Chat

### Fase 7: Finalização ✅
- Validações finais
- Documentação
- Testes

---

## 8. Aprovações

**Status**: ✅ Aprovado e Implementado

**Data de Conclusão**: 2025-01-22

**Validações Realizadas**:
- ✅ Estrutura do banco de dados
- ✅ Dados migrados (2365 templates)
- ✅ Funcionalidades implementadas
- ✅ Interface completa
- ✅ Documentação atualizada

