/**
 * Tooltips e Mensagens Explicativas do Pipeline de Processamento
 * 
 * Este arquivo centraliza todas as explicações sobre o fluxo de processamento de dados,
 * facilitando manutenção e garantindo consistência na comunicação com o usuário.
 */

// ================================================================
// ETAPAS DO PIPELINE RAG
// ================================================================

export const PIPELINE_STEPS = [
  {
    id: 1,
    key: 'upload',
    name: 'Upload',
    icon: '📤',
    description: 'Arquivo enviado ao servidor',
    tooltip: 'O arquivo é enviado para o servidor e salvo no disco. Nesta etapa, validamos o tipo de arquivo, calculamos o hash SHA-256 para evitar duplicatas e criamos o registro inicial no banco de dados.',
    technicalDetails: 'O arquivo é salvo em public/uploads/{hash}-{nome} e um registro é criado na tabela documents com status "pending".',
    estimatedTime: '1-2s',
  },
  {
    id: 2,
    key: 'conversion',
    name: 'Conversão',
    icon: '🔄',
    description: 'Convertendo para Markdown',
    tooltip: 'O documento é convertido para formato Markdown, preservando a estrutura (títulos, listas, parágrafos). PDF e DOCX são processados com bibliotecas especializadas.',
    technicalDetails: 'Usa mammoth para DOCX, pdf-parse para PDF. O texto extraído é limpo e estruturado em Markdown canônico.',
    estimatedTime: '5-30s',
  },
  {
    id: 3,
    key: 'filtering',
    name: 'Filtragem',
    icon: '🔍',
    description: 'Validando tamanho do documento',
    tooltip: 'Verificamos se o documento tem tamanho adequado (entre 300 e 1.000.000 palavras). Documentos muito pequenos ou grandes são rejeitados automaticamente.',
    technicalDetails: 'MIN_WORDS=300, MAX_WORDS=1000000. Documentos fora desse intervalo recebem status "rejected" e não prosseguem.',
    estimatedTime: '1-2s',
  },
  {
    id: 4,
    key: 'classification',
    name: 'Classificação',
    icon: '🤖',
    description: 'Classificando com IA',
    tooltip: 'A IA analisa o documento e extrai metadados estruturados: tipo de documento, área jurídica, partes envolvidas, datas importantes, etc. Esses metadados são salvos como Template.',
    technicalDetails: 'Usa GPT-4 ou modelo configurado para gerar um TemplateDocument com schema definido em settings. O resultado é armazenado na tabela templates.',
    estimatedTime: '10-60s',
    usesAI: true,
  },
  {
    id: 5,
    key: 'chunking',
    name: 'Geração de Chunks',
    icon: '📦',
    description: 'Dividindo em pedaços menores',
    tooltip: 'O documento é dividido em chunks (pedaços) de até 800 tokens cada. Isso permite busca semântica mais precisa e garante que a IA consiga processar todo o conteúdo.',
    technicalDetails: 'Usa chunker semântico que respeita parágrafos e seções. MAX_TOKENS=800. Chunks são armazenados temporariamente em memória.',
    estimatedTime: '2-10s',
  },
  {
    id: 6,
    key: 'embedding',
    name: 'Embeddings',
    icon: '🧠',
    description: 'Gerando vetores semânticos',
    tooltip: 'Cada chunk é transformado em um vetor de 1536 dimensões (embedding) que captura seu significado semântico. Isso permite busca por similaridade no banco de dados.',
    technicalDetails: 'Usa text-embedding-3-small da OpenAI. Processa em lotes de 64 chunks. Embeddings são vetores de 1536 dimensões.',
    estimatedTime: '5-30s',
    usesAI: true,
  },
  {
    id: 7,
    key: 'storage',
    name: 'Armazenamento',
    icon: '💾',
    description: 'Salvando no banco de dados',
    tooltip: 'Os chunks e embeddings são salvos no NeonDB (PostgreSQL com pgvector). Agora o documento está pronto para busca semântica e pode ser usado pelo assistente de IA.',
    technicalDetails: 'Insere registros em template_chunks com embeddings. Atualiza documents.status para "completed". Os vetores ficam disponíveis para busca via pgvector.',
    estimatedTime: '2-15s',
  },
] as const

// ================================================================
// GLOSSÁRIO DE TERMOS
// ================================================================

export const GLOSSARY = {
  embedding: {
    title: 'Embedding (Vetor Semântico)',
    description: 'Uma representação numérica do significado de um texto. Textos com significados similares têm embeddings próximos, permitindo busca por similaridade.',
    example: 'A frase "contrato de aluguel" terá um embedding próximo a "locação de imóvel".',
  },
  chunk: {
    title: 'Chunk (Pedaço de Texto)',
    description: 'Uma porção do documento (até 800 tokens) que é processada individualmente. Dividir em chunks permite busca mais precisa.',
    example: 'Um documento de 100 páginas pode gerar 200-300 chunks.',
  },
  template: {
    title: 'Template / Schema',
    description: 'Estrutura de metadados extraída do documento pela IA. Define tipo de documento, área jurídica, partes, datas importantes, etc.',
    example: 'Um contrato será classificado como "Contrato", área "Direito Civil", partes "Locador e Locatário".',
  },
  pgvector: {
    title: 'PgVector',
    description: 'Extensão do PostgreSQL que permite armazenar e buscar vetores (embeddings). Usado para busca semântica.',
    example: 'Ao buscar "rescisão de contrato", o pgvector encontra chunks similares nos documentos.',
  },
  rag: {
    title: 'RAG (Retrieval-Augmented Generation)',
    description: 'Técnica que combina busca semântica com geração de texto. A IA busca documentos relevantes e usa como contexto para responder perguntas.',
    example: 'Quando perguntado sobre prazos, a IA busca contratos relevantes e responde baseado neles.',
  },
  markdown: {
    title: 'Markdown',
    description: 'Formato de texto simples que preserva estrutura (títulos, listas, etc). Usado como formato canônico para todos os documentos.',
    example: '# Título\n## Subtítulo\n- Item 1\n- Item 2',
  },
  hash: {
    title: 'Hash SHA-256',
    description: 'Identificador único gerado a partir do conteúdo do arquivo. Permite detectar duplicatas e rastrear mudanças.',
    example: 'Se você enviar o mesmo arquivo duas vezes, o sistema detecta pela hash e não reprocessa.',
  },
}

// ================================================================
// STATUS E SEUS SIGNIFICADOS
// ================================================================

export const STATUS_EXPLANATIONS = {
  pending: {
    label: 'Aguardando Processamento',
    description: 'O arquivo foi enviado e está na fila para ser processado.',
    color: 'yellow',
    icon: '⏳',
    action: 'Aguarde. O processamento iniciará automaticamente.',
  },
  processing: {
    label: 'Em Processamento',
    description: 'O documento está sendo processado pelo pipeline RAG.',
    color: 'orange',
    icon: '🔄',
    action: 'Acompanhe o progresso em tempo real.',
  },
  completed: {
    label: 'Processado com Sucesso',
    description: 'O documento foi processado e está disponível para busca semântica.',
    color: 'green',
    icon: '✅',
    action: 'O documento já pode ser usado pelo assistente de IA.',
  },
  failed: {
    label: 'Processamento Falhou',
    description: 'Houve um erro durante o processamento.',
    color: 'red',
    icon: '❌',
    action: 'Verifique o erro e tente reprocessar ou contacte o suporte.',
  },
  rejected: {
    label: 'Documento Rejeitado',
    description: 'O documento não atende aos critérios (muito pequeno, muito grande, ou formato inválido).',
    color: 'gray',
    icon: '🚫',
    action: 'Verifique se o documento tem conteúdo suficiente (mínimo 300 palavras).',
  },
}

// ================================================================
// MENSAGENS DE ERRO COMUNS E SOLUÇÕES
// ================================================================

export const ERROR_SOLUTIONS = {
  'Muito pequeno': {
    title: 'Documento muito pequeno',
    explanation: 'O documento tem menos de 300 palavras.',
    solution: 'Adicione mais conteúdo ao documento ou combine vários documentos pequenos em um único arquivo.',
  },
  'Muito grande': {
    title: 'Documento muito grande',
    explanation: 'O documento excede o limite de 1.000.000 palavras.',
    solution: 'Divida o documento em arquivos menores e envie separadamente.',
  },
  'Arquivo não encontrado': {
    title: 'Arquivo não encontrado no disco',
    explanation: 'O arquivo foi registrado no banco mas não está no disco.',
    solution: 'Faça upload novamente. Se o erro persistir, contacte o suporte.',
  },
  'Erro na classificação': {
    title: 'Falha ao classificar documento',
    explanation: 'A IA não conseguiu extrair metadados do documento.',
    solution: 'Verifique se o documento tem conteúdo legível. Tente reprocessar ou use um formato diferente (ex: DOCX em vez de PDF).',
  },
  'Erro ao gerar embeddings': {
    title: 'Falha ao gerar vetores semânticos',
    explanation: 'Erro ao conectar com o serviço de embeddings (OpenAI).',
    solution: 'Verifique a configuração da API key da OpenAI. Tente reprocessar em alguns minutos.',
  },
  'Nenhum chunk gerado': {
    title: 'Nenhum chunk foi gerado',
    explanation: 'O documento foi processado mas não gerou chunks válidos.',
    solution: 'Verifique se o documento tem conteúdo de texto. PDFs escaneados (imagens) não são suportados.',
  },
}

// ================================================================
// TIPOS DE DOCUMENTO E SUAS CARACTERÍSTICAS
// ================================================================

export const DOCUMENT_TYPES = {
  pdf: {
    name: 'PDF',
    icon: '📄',
    extensions: ['.pdf'],
    description: 'Documentos PDF são convertidos usando pdf-parse.',
    maxSize: '50MB',
    tips: 'PDFs nativos (não escaneados) têm melhor qualidade de extração. PDFs escaneados precisam de OCR (não suportado ainda).',
  },
  docx: {
    name: 'Word (DOCX)',
    icon: '📝',
    extensions: ['.docx'],
    description: 'Documentos Word modernos são convertidos usando mammoth.',
    maxSize: '50MB',
    tips: 'DOCX preserva melhor a estrutura (títulos, listas, tabelas) que PDF.',
  },
  doc: {
    name: 'Word (DOC)',
    icon: '📝',
    extensions: ['.doc'],
    description: 'Documentos Word antigos são convertidos usando textract.',
    maxSize: '50MB',
    tips: 'Recomendamos converter para DOCX antes do upload para melhor qualidade.',
  },
  txt: {
    name: 'Texto',
    icon: '📃',
    extensions: ['.txt'],
    description: 'Arquivos de texto puro são processados diretamente.',
    maxSize: '10MB',
    tips: 'Textos sem formatação podem perder estrutura semântica.',
  },
  csv: {
    name: 'CSV / Planilha',
    icon: '📊',
    extensions: ['.csv', '.xlsx'],
    description: 'Planilhas são processadas linha por linha.',
    maxSize: '20MB',
    tips: 'A primeira linha deve conter cabeçalhos. Até 50.000 linhas.',
  },
  sped: {
    name: 'SPED Contábil',
    icon: '💰',
    extensions: ['.txt', '.sped'],
    description: 'Arquivos SPED são parseados e extraem plano de contas, saldos e lançamentos.',
    maxSize: '100MB',
    tips: 'Apenas SPED Contábil (ECD) é suportado. Um arquivo por vez.',
  },
}

// ================================================================
// FLUXO ESPECÍFICO POR TIPO
// ================================================================

export const PROCESSING_FLOWS = {
  general: {
    name: 'Documentos Gerais',
    types: ['pdf', 'docx', 'doc', 'txt'],
    steps: ['upload', 'conversion', 'filtering', 'classification', 'chunking', 'embedding', 'storage'],
    endpoint: '/api/documents/upload',
    description: 'Pipeline RAG completo para documentos de texto.',
  },
  csv: {
    name: 'Planilhas CSV',
    types: ['csv', 'xlsx'],
    steps: ['upload', 'parsing', 'validation', 'storage'],
    endpoint: '/api/csv/upload',
    description: 'Importação de dados tabulares.',
  },
  sped: {
    name: 'SPED Contábil',
    types: ['sped', 'txt'],
    steps: ['upload', 'parsing', 'extraction', 'storage'],
    endpoint: '/api/ingest/sped',
    description: 'Extração de plano de contas, saldos e lançamentos contábeis.',
  },
}

// ================================================================
// TABELAS DO BANCO DE DADOS
// ================================================================

export const DATABASE_TABLES = {
  documents: {
    name: 'documents',
    description: 'Registro inicial do upload',
    fields: ['id', 'fileName', 'filePath', 'fileHash', 'status', 'organizationId', 'uploadedBy'],
    purpose: 'Rastreia o arquivo físico e status de processamento.',
  },
  document_files: {
    name: 'document_files',
    description: 'Arquivo processado pelo RAG',
    fields: ['id', 'filePath', 'fileHash', 'status', 'wordsCount', 'processedAt'],
    purpose: 'Criado durante o processamento, armazena metadados do RAG.',
  },
  templates: {
    name: 'templates',
    description: 'Metadados extraídos pela IA',
    fields: ['id', 'documentFileId', 'templateArea', 'templateDocType', 'metadata'],
    purpose: 'Schema/estrutura do documento classificado pela IA.',
  },
  template_chunks: {
    name: 'template_chunks',
    description: 'Chunks com embeddings',
    fields: ['id', 'templateId', 'content', 'embedding', 'chunkIndex'],
    purpose: 'Pedaços do documento com vetores para busca semântica (pgvector).',
  },
}

// ================================================================
// AÇÕES DO USUÁRIO
// ================================================================

export const USER_ACTIONS = {
  reprocess: {
    title: 'Reprocessar Documento',
    description: 'Executa o pipeline RAG novamente do início.',
    when: 'Use quando o processamento falhar ou quando quiser atualizar metadados.',
  },
  download: {
    title: 'Download do Arquivo',
    description: 'Baixa o arquivo original que foi enviado.',
    when: 'Use para obter uma cópia local do documento.',
  },
  view: {
    title: 'Ver Detalhes',
    description: 'Mostra metadados, chunks, embeddings e logs de processamento.',
    when: 'Use para inspecionar o resultado do processamento.',
  },
  delete: {
    title: 'Deletar Documento',
    description: 'Remove o arquivo, registros e todos os dados relacionados (chunks, embeddings).',
    when: 'Use para remover documentos que não são mais necessários. AÇÃO IRREVERSÍVEL.',
  },
}

