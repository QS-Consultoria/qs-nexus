# Índice da Documentação

Esta pasta contém toda a documentação do sistema RAG LegalWise, organizada por categorias.

## Estrutura da Documentação

```
docs/
├── INDEX.md                    # Este arquivo
├── README.md                   # Visão geral do sistema
│
├── CHANGELOG-2025-11-21.md    # Changelog completo das mudanças de 21/11/2025
│
├── setup/                      # Configuração e Setup
│   ├── SETUP.md               # Guia completo de configuração
│   └── QUICK_START.md         # Guia rápido para começar
│
├── architecture/               # Arquitetura e Dados
│   ├── ARQUITETURA.md         # Arquitetura detalhada do sistema
│   ├── DADOS.md               # Estrutura de dados e schema
│   └── DASHBOARD.md           # Arquitetura do Dashboard
│
├── guides/                     # Guias de Uso
│   ├── paralelizacao.md       # Guia de paralelização e performance
│   ├── classificacao.md       # Guia de classificação de documentos
│   ├── troubleshooting.md    # Guia de troubleshooting e scripts utilitários
│   ├── dashboard.md           # Guia de uso do Dashboard
│   └── gemini-integration.md  # Guia de integração com Google Gemini
│
└── reference/                  # Referência Técnica
    ├── concurrency-pool.md    # Documentação do ConcurrencyPool
    ├── worker-threads.md      # Documentação de Worker Threads
    └── dashboard-api.md       # Referência de APIs do Dashboard
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

### [gemini-integration.md](./guides/gemini-integration.md)

Guia de integração com Google Gemini:

- Configuração da API key
- Estruturação de markdown com Gemini
- Uso de modelos Gemini no chat RAG
- Troubleshooting
- Melhores práticas

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
