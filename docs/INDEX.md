# Índice da Documentação

Esta pasta contém toda a documentação do sistema RAG LegalWise, organizada por categorias.

## Estrutura da Documentação

```
docs/
├── INDEX.md                    # Este arquivo
├── README.md                   # Visão geral do sistema
│
├── setup/                      # Configuração e Setup
│   ├── SETUP.md               # Guia completo de configuração
│   └── QUICK_START.md         # Guia rápido para começar
│
├── architecture/               # Arquitetura e Dados
│   ├── ARQUITETURA.md         # Arquitetura detalhada do sistema
│   └── DADOS.md               # Estrutura de dados e schema
│
├── guides/                     # Guias de Uso
│   ├── paralelizacao.md       # Guia de paralelização e performance
│   ├── classificacao.md       # Guia de classificação de documentos
│   └── troubleshooting.md    # Guia de troubleshooting e scripts utilitários
│
└── reference/                  # Referência Técnica
    ├── concurrency-pool.md    # Documentação do ConcurrencyPool
    └── worker-threads.md      # Documentação de Worker Threads
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

## Como Usar Esta Documentação

### Para Iniciantes

1. **Começando**: Leia [QUICK_START.md](./setup/QUICK_START.md)
2. **Configurando**: Siga [SETUP.md](./setup/SETUP.md)
3. **Entendendo**: Leia [README.md](./README.md)

### Para Desenvolvedores

1. **Arquitetura**: Consulte [ARQUITETURA.md](./architecture/ARQUITETURA.md)
2. **Dados**: Consulte [DADOS.md](./architecture/DADOS.md)
3. **Paralelização**: Leia [paralelizacao.md](./guides/paralelizacao.md)
4. **Troubleshooting**: Consulte [troubleshooting.md](./guides/troubleshooting.md)
5. **Referência**: Use [reference/](./reference/) para detalhes técnicos

### Para Otimização

1. **Performance**: Leia [paralelizacao.md](./guides/paralelizacao.md)
2. **ConcurrencyPool**: Consulte [concurrency-pool.md](./reference/concurrency-pool.md)
3. **Workers**: Consulte [worker-threads.md](./reference/worker-threads.md)

## Últimas Implementações

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
│   ├── setup/                 # Setup e configuração
│   ├── architecture/          # Arquitetura e dados
│   ├── guides/                # Guias de uso
│   └── reference/             # Referência técnica
├── lib/                        # Código TypeScript
│   ├── db/                    # Banco de dados
│   ├── services/              # Serviços
│   ├── utils/                 # Utilitários (ConcurrencyPool)
│   ├── workers/               # Worker Threads
│   └── types/                 # Tipos
├── scripts/                    # Scripts do pipeline
├── package.json
└── README.md                   # README principal (raiz)
```
