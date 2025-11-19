# Índice da Documentação

Esta pasta contém toda a documentação do sistema RAG LegalWise.

## Documentos Principais

### [README.md](./README.md)
Visão geral completa do sistema atual:
- Objetivo e arquitetura
- Pipeline de processamento
- Estrutura do banco de dados
- Características principais

### [SETUP.md](./SETUP.md)
Guia completo de configuração:
- Setup do Neon
- Configuração de variáveis de ambiente
- Execução de migrations
- Troubleshooting

### [QUICK_START.md](./QUICK_START.md)
Guia rápido para começar:
- Instalação
- Configuração básica
- Pipeline completo
- Utilitários

## Documentação Técnica

### [ARQUITETURA.md](./ARQUITETURA.md)
Arquitetura detalhada do sistema:
- Fluxo de dados
- Componentes e serviços
- Estrutura de dados
- Decisões de design

### [DADOS.md](./DADOS.md)
Estrutura de dados:
- Schema do banco de dados
- Enums e tipos
- Operações de busca
- Validação

### [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
Resumo da implementação:
- O que foi implementado
- Características
- Próximos passos

## Documentação Histórica

### [prompt.md](./prompt.md)
Prompt original do projeto (mantido para referência histórica).

## Como Usar Esta Documentação

1. **Começando:** Leia [QUICK_START.md](./QUICK_START.md)
2. **Configurando:** Siga [SETUP.md](./SETUP.md)
3. **Entendendo:** Leia [README.md](./README.md)
4. **Profundidade técnica:** Consulte [ARQUITETURA.md](./ARQUITETURA.md) e [DADOS.md](./DADOS.md)

## Estrutura do Projeto

```
lw-rag-system/
├── docs/                    # Esta pasta
│   ├── INDEX.md            # Este arquivo
│   ├── README.md           # Visão geral
│   ├── SETUP.md            # Setup completo
│   ├── QUICK_START.md      # Guia rápido
│   ├── ARQUITETURA.md      # Arquitetura
│   ├── DADOS.md            # Estrutura de dados
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── prompt.md           # Histórico
├── lib/                     # Código TypeScript
│   ├── db/                 # Banco de dados
│   ├── services/           # Serviços
│   └── types/              # Tipos
├── scripts/                 # Scripts do pipeline
├── package.json
└── README.md               # README principal (raiz)
```

## Links Úteis

- [AI SDK Documentation](https://ai-sdk.dev/docs/ai-sdk-core/embeddings)
- [Drizzle ORM](https://orm.drizzle.team/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Neon Documentation](https://neon.tech/docs)
