# Documentação do Sistema RAG LegalWise

Este projeto implementa um sistema completo de RAG (Retrieval-Augmented Generation) para processar documentos jurídicos (DOCX, DOC, PDF), convertê-los para Markdown, classificá-los com metadados estruturados e gerar embeddings para uso em um agente de IA.

## Objetivo

O objetivo principal é criar um sistema RAG que sirva como base de conhecimento para treinar um agente de IA a gerar documentos jurídicos. Os documentos (DOCX, DOC, PDF) servem como exemplos/templates de como um documento jurídico deve ser estruturado.

## Arquitetura Atual

O sistema foi completamente refatorado de Python para TypeScript/Node.js e agora utiliza:

- **Node.js + TypeScript** para processamento
- **AI SDK** para embeddings e classificação
- **Drizzle ORM** para gerenciamento de banco de dados
- **Neon (PostgreSQL + pgvector)** para armazenamento
- **Markdown** como formato canônico (não mais texto puro)

## Pipeline de Processamento

O pipeline atual segue os seguintes passos:

### 1. Processamento de Documentos (`npm run rag:process`)

- Varre recursivamente arquivos DOCX, DOC e PDF em `../list-docx` (caminho relativo)
- Converte documentos → Markdown preservando formatação:
  - **DOCX**: Usa `mammoth` (preserva estrutura completa)
  - **DOC**: Usa `textract` (Node.js puro), com fallback para LibreOffice ou Pandoc, e estruturação opcional com Google Gemini 2.0 Flash
  - **PDF**: Usa `pdf-parse` (Node.js puro), com fallback para Pandoc, e estruturação opcional com Google Gemini 2.0 Flash (melhor qualidade)
- Calcula hash SHA256 para tracking
- Armazena status no banco de dados

### 2. Filtragem (`npm run rag:filter`)

- Filtra por tamanho (300-25.000 palavras)
- Marca documentos rejeitados (nunca serão reprocessados)
- Valida integridade dos documentos

### 3. Classificação (`npm run rag:classify`)

- Usa AI SDK com GPT-5 para classificar
- Gera TemplateDocument completo com metadados:
  - Tipo de documento, área, jurisdição, complexidade
  - Tags, resumo, qualidade
  - Classificação GOLD/SILVER automática
- Truncamento inteligente para documentos grandes
- Validação de respostas vazias
- Logging de progresso em tempo real

### 4. Chunking (`npm run rag:chunk`)

- Chunking inteligente por seções Markdown (H1, H2)
- Fallback para chunking por parágrafos
- Preserva contexto e estrutura

### 5. Geração de Embeddings (`npm run rag:embed`)

- Usa AI SDK `embedMany` com `text-embedding-3-small`
- Batch processing (64 chunks por requisição)
- 1536 dimensões

### 6. Armazenamento (`npm run rag:store`)

- Armazena templates e chunks no Neon
- Índice HNSW para busca vetorial otimizada
- Tracking completo de processamento

## Estrutura do Banco de Dados

### Tabelas

- **`document_files`**: Tracking de arquivos processados
- **`templates`**: Documentos processados (TemplateDocument)
- **`template_chunks`**: Chunks com embeddings para RAG

### Índices

- Índices B-tree para busca comum
- **Índice HNSW** na coluna `embedding` para busca vetorial otimizada

## Características Principais

✅ **Tracking de Processamento**: Evita reprocessamento de arquivos já processados  
✅ **Caminhos Relativos**: Portável entre diferentes máquinas  
✅ **Conversão Markdown**: Preserva estrutura do documento (suporta DOCX, DOC, PDF)  
✅ **Estruturação com Gemini**: Estruturação opcional de PDF/DOC usando Google Gemini 2.0 Flash para melhor qualidade  
✅ **Classificação Inteligente**: Metadados estruturados com TemplateDocument  
✅ **Chunking Inteligente**: Por seções Markdown quando possível  
✅ **Embeddings Otimizados**: text-embedding-3-small (custo-benefício)  
✅ **Índice HNSW**: Busca vetorial otimizada  
✅ **Relatórios de Status**: `processing-status.json`  
✅ **Reprocessamento Individual**: Permite reprocessar arquivos específicos  
✅ **Reprocessamento Completo**: Permite reprocessar documento completo com novo arquivo  
✅ **Regeneração de Chunks**: Permite regenerar chunks e embeddings sem reprocessar o documento  
✅ **Múltiplos Modelos de Chat**: Suporte a OpenAI (GPT-4o, GPT-4o Mini) e Google Gemini (2.0/2.5 Flash)  
✅ **Preview de Markdown**: Visualização renderizada e edição de markdown na interface  
✅ **Paralelização Completa**: Todos os scripts principais são paralelos  
✅ **Worker Threads**: Processamento isolado de conversão de documentos (DOCX, DOC, PDF)  
✅ **ConcurrencyPool**: Sistema de pool de concorrência com retry logic

## Documentação Adicional

- [SETUP.md](./setup/SETUP.md) - Guia completo de configuração
- [QUICK_START.md](./setup/QUICK_START.md) - Guia rápido para começar
- [ARQUITETURA.md](./architecture/ARQUITETURA.md) - Arquitetura detalhada
- [DADOS.md](./architecture/DADOS.md) - Estrutura de dados
- [paralelizacao.md](./guides/paralelizacao.md) - Guia de paralelização
- [classificacao.md](./guides/classificacao.md) - Guia de classificação
- [troubleshooting.md](./guides/troubleshooting.md) - Guia de troubleshooting e scripts utilitários
- [CHANGELOG-2025-11-21.md](./CHANGELOG-2025-11-21.md) - Changelog completo das mudanças de 21/11/2025
- [INDEX.md](./INDEX.md) - Índice completo da documentação

## Notas Importantes

- Arquivos rejeitados **nunca** são reprocessados
- Caminhos são sempre **relativos ao root do projeto**
- Relatório de status é gerado em `processing-status.json` (não versionado)
- Todos os dados processados são armazenados no banco, não em arquivos locais
