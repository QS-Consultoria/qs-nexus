# Índice da Documentação

Esta pasta contém toda a documentação do sistema RAG LegalWise, organizada por categorias.

## Estrutura da Documentação

```
docs/
├── INDEX.md                    # Este arquivo
├── README.md                   # Visão geral do sistema
│
├── CHANGELOG-2025-11-21.md    # Changelog completo das mudanças de 21/11/2025
├── CHANGELOG-2025-11-22.md    # Changelog completo das mudanças de 22/11/2025
├── CHANGELOG-2025-11-23.md    # Changelog completo das mudanças de 23/11/2025
│
├── setup/                      # Configuração e Setup
│   ├── SETUP.md               # Guia completo de configuração
│   └── QUICK_START.md         # Guia rápido para começar
│
├── architecture/               # Arquitetura e Dados
│   ├── ARQUITETURA.md         # Arquitetura detalhada do sistema
│   ├── DADOS.md               # Estrutura de dados e schema
│   ├── DASHBOARD.md           # Arquitetura do Dashboard
│   ├── PRD-CLASSIFICACAO-CONFIGURAVEL.md  # Product Requirements Document
│   └── TECH-SPECS-CLASSIFICACAO.md       # Technical Specifications
│
├── guides/                     # Guias de Uso
│   ├── paralelizacao.md       # Guia de paralelização e performance
│   ├── classificacao.md       # Guia de classificação de documentos
│   ├── classificacao-configuravel.md  # Guia de classificação configurável
│   ├── schema-dinamico.md    # Guia de schema dinâmico de templates
│   ├── troubleshooting.md    # Guia de troubleshooting e scripts utilitários
│   ├── dashboard.md           # Guia de uso do Dashboard
│   ├── gemini-integration.md  # Guia de integração com Google Gemini
│   ├── model-tracking.md      # Guia de tracking de modelos e tokens
│   └── tailwind-v4-css-variables.md  # Guia sobre problema do Tailwind v4 com variáveis CSS
│
└── reference/                  # Referência Técnica
    ├── concurrency-pool.md    # Documentação do ConcurrencyPool
    ├── worker-threads.md      # Documentação de Worker Threads
    ├── dashboard-api.md       # Referência de APIs do Dashboard
    └── classification-api.md  # Referência de APIs de Classificação e Schema
```

## Documentos Principais

### [README.md](./README.md)

Visão geral completa do sistema:

- Objetivo e arquitetura
- Pipeline de processamento
- Estrutura do banco de dados
- Características principais

## Setup e Configuração

### [SETUP.md](./setup/SETUP.md)

Guia completo de configuração:

- Setup do Neon
- Configuração de variáveis de ambiente
- Execução de migrations
- Troubleshooting

### [QUICK_START.md](./setup/QUICK_START.md)

Guia rápido para começar:

- Instalação
- Configuração básica
- Pipeline completo
- Utilitários

## Arquitetura

### [ARQUITETURA.md](./architecture/ARQUITETURA.md)

Arquitetura detalhada do sistema:

- Fluxo de dados
- Componentes e serviços
- Estrutura de dados
- Decisões de design

### [DADOS.md](./architecture/DADOS.md)

Estrutura de dados:

- Schema do banco de dados
- Enums e tipos
- Operações de busca
- Validação

### [DASHBOARD.md](./architecture/DASHBOARD.md)

Arquitetura do Dashboard:

- Decisões de arquitetura (Next.js, NextAuth, Tailwind, shadcn/ui)
- Estrutura de rotas (App Router)
- Fluxo de autenticação
- Estrutura de APIs
- Fluxo RAG no chat
- Integração com sistema RAG existente
- Componentes e hooks

### [PRD-CLASSIFICACAO-CONFIGURAVEL.md](./architecture/PRD-CLASSIFICACAO-CONFIGURAVEL.md)

Product Requirements Document do sistema de classificação configurável:

- Objetivos e visão geral
- Requisitos funcionais e não-funcionais
- Escopo e métricas de sucesso
- Riscos e mitigações
- Roadmap de implementação

### [TECH-SPECS-CLASSIFICACAO.md](./architecture/TECH-SPECS-CLASSIFICACAO.md)

Technical Specifications detalhadas:

- Arquitetura técnica completa
- Estrutura de dados e tipos
- Serviços e componentes
- APIs e endpoints
- Front-end e componentes
- Migração de dados
- Segurança e performance

## Guias

### [paralelizacao.md](./guides/paralelizacao.md)

Guia de paralelização e performance:

- Scripts paralelizados
- Configuração de concorrência
- Rate limiting
- Troubleshooting

### [classificacao.md](./guides/classificacao.md)

Guia de classificação de documentos:

- Decisões de design (envio como texto, truncamento, validação)
- Limitações da API e soluções implementadas
- Logging de progresso
- Tratamento de erros

### [classificacao-configuravel.md](./guides/classificacao-configuravel.md)

Guia de classificação configurável:

- Como criar e configurar classificações
- Múltiplos providers e modelos
- System prompt customizado
- Geração dinâmica de prompt do schema
- Função de extração customizada
- Limites de tokens
- Truncamento inteligente
- Dicas e melhores práticas

### [schema-dinamico.md](./guides/schema-dinamico.md)

Guia de schema dinâmico de templates:

- Como criar e configurar schemas
- Tipos de campo disponíveis
- Campos aninhados e arrays
- Validação e preview
- Geração automática de prompt do schema
- Como o sistema funciona
- Dicas e melhores práticas

### [troubleshooting.md](./guides/troubleshooting.md)

Guia de troubleshooting e scripts utilitários:

- Problemas comuns e soluções
- Scripts utilitários para correção de status
- Correções implementadas no processamento e classificação
- Casos de uso e exemplos

### [dashboard.md](./guides/dashboard.md)

Guia de uso do Dashboard:

- Autenticação (registro e login)
- Dashboard principal (estatísticas e gráficos)
- Upload de arquivos
- Lista e detalhes de arquivos
- Chat RAG com múltiplos modelos
- Preview e edição de markdown
- Reprocessamento e regeneração de chunks
- Navegação
- Troubleshooting específico do dashboard
- Página de Ajuda (`/help`) com informações completas do sistema

### [gemini-integration.md](./guides/gemini-integration.md)

Guia de integração com Google Gemini:

- Configuração da API key
- Estruturação de markdown com Gemini
- Uso de modelos Gemini no chat RAG
- Troubleshooting
- Melhores práticas

### [model-tracking.md](./guides/model-tracking.md)

Guia de tracking de modelos e tokens:

- Como funciona o tracking
- Logs de debug
- Visualização no dashboard
- API de estatísticas
- Casos de uso e exemplos
- Troubleshooting

### [cost-tracking.md](./guides/cost-tracking.md)

Guia de tracking de custos:

- Como funciona o cálculo de custos
- Estrutura de preços por modelo
- Visualização no dashboard
- API de estatísticas de custos
- Casos de uso e exemplos
- Troubleshooting
- Atualização de preços

## Referência Técnica

### [concurrency-pool.md](./reference/concurrency-pool.md)

Documentação do ConcurrencyPool:

- Interface e API
- Uso básico e avançado
- Configuração
- Exemplos

### [worker-threads.md](./reference/worker-threads.md)

Documentação de Worker Threads:

- Arquitetura
- Implementação
- Comunicação
- Performance

### [dashboard-api.md](./reference/dashboard-api.md)

Referência de APIs do Dashboard:

- Endpoints de autenticação
- Endpoints de documentos (stats, listagem, detalhes)
- Endpoints de upload e processamento
- Endpoint de chat RAG
- Códigos de erro
- Exemplos de uso

### [classification-api.md](./reference/classification-api.md)

Referência de APIs de Classificação e Schema:

- Classification Config API (CRUD completo)
- Template Schema API (CRUD completo)
- Classification API (classificar documentos)
- Exemplos de uso
- Códigos de erro
- Limites e restrições

## Como Usar Esta Documentação

### Para Iniciantes

1. **Começando**: Leia [QUICK_START.md](./setup/QUICK_START.md)
2. **Configurando**: Siga [SETUP.md](./setup/SETUP.md)
3. **Entendendo**: Leia [README.md](./README.md)

### Para Desenvolvedores

1. **Arquitetura**: Consulte [ARQUITETURA.md](./architecture/ARQUITETURA.md) e [DASHBOARD.md](./architecture/DASHBOARD.md)
2. **Dados**: Consulte [DADOS.md](./architecture/DADOS.md)
3. **Paralelização**: Leia [paralelizacao.md](./guides/paralelizacao.md)
4. **Dashboard**: Leia [dashboard.md](./guides/dashboard.md) e [dashboard-api.md](./reference/dashboard-api.md)
5. **Troubleshooting**: Consulte [troubleshooting.md](./guides/troubleshooting.md)
6. **Referência**: Use [reference/](./reference/) para detalhes técnicos

### Para Otimização

1. **Performance**: Leia [paralelizacao.md](./guides/paralelizacao.md)
2. **ConcurrencyPool**: Consulte [concurrency-pool.md](./reference/concurrency-pool.md)
3. **Workers**: Consulte [worker-threads.md](./reference/worker-threads.md)

## Últimas Implementações

### Implementação do Tema Amber Minima (2025-11-23)

- ✅ **Novo Tema Amber Minima**: Tema inspirado no 21st Magic com design minimalista
- ✅ **Cor Primária Âmbar**: Cor vibrante (#f59e0b) substituindo o verde-azulado anterior
- ✅ **Design Minimalista**: Visual limpo com border radius reduzido (0.375rem)
- ✅ **Paleta Harmoniosa**: Tons de âmbar consistentes em toda a interface
- ✅ **Modo Escuro Refinado**: Background preto profundo (#171717) com excelente contraste
- ✅ **Cores de Gráficos**: Suporte completo para paleta de gráficos baseada em âmbar
- ✅ **Transições Suaves**: Animações fluidas e naturais mantidas
- ✅ **Scrollbar Personalizada**: Estilo moderno com suporte a tema claro/escuro

Ver [CHANGELOG-2025-11-23.md](./CHANGELOG-2025-11-23.md) para detalhes completos.

### Tracking de Modelos, Tokens e Custos (2025-11-22)

- ✅ **Logs de Debug**: Logs detalhados quando `DEBUG=true` mostrando provider, modelo e tokens usados
- ✅ **Armazenamento de Modelo**: Colunas `model_provider` e `model_name` na tabela templates
- ✅ **Armazenamento de Tokens**: Colunas `input_tokens` e `output_tokens` na tabela templates
- ✅ **Armazenamento de Custos**: Coluna `cost_usd` na tabela templates com cálculo automático
- ✅ **Captura de Tokens**: Uso direto do objeto `usage` do AI SDK para precisão
- ✅ **Cálculo de Custos**: Cálculo automático baseado em preços oficiais dos providers
- ✅ **API de Estatísticas**: Endpoint `/api/documents/model-stats` com estatísticas agregadas (modelos, tokens e custos)
- ✅ **Dashboard de Modelos**: Gráficos de documentos por provider e modelo
- ✅ **Dashboard de Tokens**: Gráficos de distribuição e uso de tokens por provider e modelo
- ✅ **Dashboard de Custos**: Gráficos de custos por provider e modelo com análise completa

Ver [CHANGELOG-2025-11-22.md](./CHANGELOG-2025-11-22.md) e [Guia de Tracking de Custos](./guides/cost-tracking.md) para detalhes completos.

### Sistema de Classificação Configurável e Schema Dinâmico (2025-01-22)

- ✅ **Classificação Configurável**: Sistema completo para configurar classificação via interface web
- ✅ **Múltiplos Providers**: Suporte a OpenAI e Google/Gemini com seleção de modelo
- ✅ **Schema Dinâmico**: Templates com campos configuráveis definidos pelo usuário
- ✅ **Tipos Zod Completos**: Suporte a todos os tipos relevantes (string, number, boolean, date, bigint, enum, literal, array, object, union)
- ✅ **Campos Aninhados**: Suporte a objetos e arrays de objetos recursivos
- ✅ **Estimativa de Tokens**: Uso de tiktoken para estimativa precisa
- ✅ **Função de Extração Customizada**: Função JavaScript customizada para extrair conteúdo
- ✅ **Truncamento Inteligente**: Baseado em limites de tokens do modelo
- ✅ **Geração Dinâmica de Prompt**: Prompt do schema gerado automaticamente a partir do schema configurado
- ✅ **Interface Completa**: Página de settings com configuração de classificação e schema
- ✅ **Migração de Dados**: 2365 templates migrados para formato JSONB

Ver [Documentação de Progresso](./implementation-progress/classificacao-configuravel-schema-dinamico.md) para detalhes completos.

Documentação:
- [PRD](./architecture/PRD-CLASSIFICACAO-CONFIGURAVEL.md)
- [Tech Specs](./architecture/TECH-SPECS-CLASSIFICACAO.md)
- [Guia de Classificação Configurável](./guides/classificacao-configuravel.md)
- [Guia de Schema Dinâmico](./guides/schema-dinamico.md)
- [Referência de API](./reference/classification-api.md)

### Integração Google Gemini e Melhorias (2025-11-21)

- ✅ **Estruturação de Markdown com Gemini**: Estruturação opcional de PDF/DOC usando Google Gemini 2.0 Flash
- ✅ **Múltiplos Modelos de Chat**: Suporte a OpenAI (GPT-4o, GPT-4o Mini) e Google Gemini (2.0/2.5 Flash)
- ✅ **Preview de Markdown**: Visualização renderizada e edição de markdown na interface
- ✅ **Reprocessamento Completo**: Reprocessar documento completo com novo arquivo
- ✅ **Regeneração de Chunks**: Regenerar chunks e embeddings sem reprocessar o documento
- ✅ **Melhorias no Frontend**: Paginação, tema claro/escuro, refatoração de componentes

Ver [CHANGELOG-2025-11-21.md](./CHANGELOG-2025-11-21.md) para detalhes completos.

### Dashboard Frontend (2024-11-20)

- ✅ **Next.js 14+ Integrado**: Dashboard web completo integrado ao projeto existente
- ✅ **Autenticação**: NextAuth.js v5 com sistema de login/registro
- ✅ **Dashboard de Relatórios**: Estatísticas, gráficos e métricas dos documentos RAG
- ✅ **Upload de Arquivos**: Upload múltiplo e por pasta com feedback via SSE
- ✅ **Lista e Detalhes**: Visualização completa de arquivos processados
- ✅ **Chat RAG**: Interface de chat com busca vetorial e streaming
- ✅ **Layout e Navegação**: Sidebar, navbar e proteção de rotas
- ✅ **Documentação Completa**: Arquitetura, guias e referência de APIs

Ver [RESUMO-EXECUTIVO.md](./implementation-progress/RESUMO-EXECUTIVO.md) para detalhes completos.

Documentação:

- [Arquitetura do Dashboard](./architecture/DASHBOARD.md)
- [Guia de Uso](./guides/dashboard.md)
- [Referência de APIs](./reference/dashboard-api.md)

### Paralelização (2024)

- ✅ **ConcurrencyPool**: Sistema de pool de concorrência para processamento paralelo
- ✅ **Worker Threads**: Processamento isolado de conversão DOCX → Markdown
- ✅ **Scripts Paralelizados**: Todos os scripts principais agora são paralelos
- ✅ **Rate Limiting**: Controle automático de rate limits da OpenAI
- ✅ **Progress Tracking**: Acompanhamento de progresso em tempo real

Ver [paralelizacao.md](./guides/paralelizacao.md) para detalhes.

### Classificação (2024)

- ✅ **Envio como Texto Direto**: Solução para limitação da API (não suporta arquivos de texto)
- ✅ **Truncamento Inteligente**: Tratamento de documentos grandes mantendo início e fim
- ✅ **Validação de Respostas**: Detecção e parada imediata se IA retornar dados vazios
- ✅ **Logging de Progresso**: Acompanhamento de início/fim de cada classificação
- ✅ **Schema Correto**: Todos os campos obrigatórios para compatibilidade com API

Ver [classificacao.md](./guides/classificacao.md) para detalhes.

### Correções de Processamento e Classificação (2024)

- ✅ **Tratamento de Erros**: Arquivos que falharem são automaticamente marcados como rejeitados
- ✅ **Detecção de Limbo**: Arquivos em `processing` sem markdown são detectados e reprocessados
- ✅ **Scripts Utilitários**: Novos scripts para correção de status e limpeza de arquivos órfãos
- ✅ **Logs Detalhados**: Logs melhorados para debug e identificação de problemas
- ✅ **Callback onTaskFailed**: Implementado em todos os scripts para tratamento de falhas

Ver [troubleshooting.md](./guides/troubleshooting.md) para detalhes.

## Links Úteis

- [AI SDK Documentation](https://ai-sdk.dev/docs/ai-sdk-core/embeddings)
- [Drizzle ORM](https://orm.drizzle.team/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Neon Documentation](https://neon.tech/docs)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)

## Estrutura do Projeto

```
lw-rag-system/
├── docs/                       # Esta pasta
│   ├── INDEX.md               # Este arquivo
│   ├── README.md              # Visão geral
│   ├── implementation-progress/ # Progresso da implementação
│   ├── setup/                 # Setup e configuração
│   ├── architecture/          # Arquitetura e dados
│   ├── guides/                # Guias de uso
│   └── reference/             # Referência técnica
├── app/                        # Next.js App Router (NOVO)
│   ├── (auth)/                # Páginas de autenticação
│   ├── (dashboard)/           # Páginas do dashboard
│   └── api/                   # API Routes
├── components/                 # Componentes React (NOVO)
│   ├── ui/                    # Componentes shadcn/ui
│   ├── dashboard/             # Componentes do dashboard
│   ├── upload/                # Componentes de upload
│   ├── files/                 # Componentes de arquivos
│   └── layout/                # Componentes de layout
├── hooks/                      # React Hooks (NOVO)
├── lib/                        # Código TypeScript
│   ├── db/                    # Banco de dados
│   ├── services/              # Serviços
│   ├── auth/                  # Autenticação (NOVO)
│   ├── utils/                 # Utilitários (ConcurrencyPool)
│   ├── workers/               # Worker Threads
│   └── types/                 # Tipos
├── scripts/                    # Scripts do pipeline
├── package.json
└── README.md                   # README principal (raiz)
```
