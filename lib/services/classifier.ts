import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { TemplateDocument, TemplateDocumentSchema } from '../types/template-document.js';

const ClassificationSchema = z.object({
  docType: TemplateDocumentSchema.shape.docType,
  area: TemplateDocumentSchema.shape.area,
  jurisdiction: z.string(),
  complexity: TemplateDocumentSchema.shape.complexity,
  tags: z.array(z.string()),
  summary: z.string().describe('Resumo de 2-3 linhas otimizado para embedding'),
  qualityScore: z.number().min(0).max(100).describe('Nota de qualidade baseada em clareza, estrutura e risco'),
  title: z.string().describe('Título do documento'),
  sections: z.array(z.object({
    name: z.string(),
    role: z.enum(['intro', 'fundamentacao', 'pedido', 'fatos', 'direito', 'conclusao', 'outro']),
  })),
});

export interface ClassificationResult {
  docType: TemplateDocument['docType'];
  area: TemplateDocument['area'];
  jurisdiction: string;
  complexity: TemplateDocument['complexity'];
  tags: string[];
  summary: string;
  qualityScore: number;
  title: string;
  sections?: Array<{ name: string; role: string }>;
}

// Limite otimizado de tokens (18k tokens) - reduzido para forçar extração inteligente
// Documentos grandes terão apenas partes relevantes extraídas antes da classificação
const MAX_INPUT_TOKENS = 18000;

/**
 * Estima tokens (aproximação: 1 token ≈ 4 caracteres para português)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Valida se a classificação retornada está vazia ou inválida
 */
function validateClassification(result: ClassificationResult, markdownPreview: string): void {
  const isEmpty = 
    !result.title || result.title.trim() === '' ||
    !result.summary || result.summary.trim() === '' ||
    !result.docType ||
    !result.area ||
    !result.complexity ||
    result.qualityScore === undefined || result.qualityScore === null;

  if (isEmpty) {
    const errorDetails = {
      title: result.title || '(vazio)',
      summary: result.summary || '(vazio)',
      docType: result.docType || '(vazio)',
      area: result.area || '(vazio)',
      complexity: result.complexity || '(vazio)',
      qualityScore: result.qualityScore ?? '(vazio)',
      jurisdiction: result.jurisdiction || '(vazio)',
      tags: result.tags || [],
      sections: result.sections || [],
      markdownPreview: markdownPreview.substring(0, 500) + (markdownPreview.length > 500 ? '...' : ''),
    };

    console.error('\n❌ ERRO CRÍTICO: Classificação retornou dados vazios!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Detalhes da resposta recebida:');
    console.error(JSON.stringify(errorDetails, null, 2));
    console.error('═══════════════════════════════════════════════════════════');
    console.error('\n🛑 PARANDO CLASSIFICAÇÃO PARA DEBUG\n');
    
    throw new Error(
      `Classificação retornou dados vazios. ` +
      `Title: "${result.title}", Summary: "${result.summary}", ` +
      `DocType: "${result.docType}", Area: "${result.area}", ` +
      `Complexity: "${result.complexity}", QualityScore: ${result.qualityScore}`
    );
  }
}

/**
 * Extrai apenas as partes relevantes do markdown para classificação
 * Reduz drasticamente o uso de tokens mantendo informações essenciais
 */
function extractClassificationRelevantContent(markdown: string): string {
  const lines = markdown.split('\n');
  const extracted: string[] = [];
  
  // 1. Primeiras 2000-3000 caracteres (título, introdução, cabeçalho)
  const headerChars = 3000;
  let headerContent = '';
  let charCount = 0;
  let headerEndLine = 0;
  
  for (let i = 0; i < lines.length && charCount < headerChars; i++) {
    const line = lines[i];
    charCount += line.length + 1; // +1 para newline
    headerEndLine = i;
    headerContent += line + '\n';
  }
  
  extracted.push(headerContent.trim());
  
  // 2. Estrutura de seções (todos os headers #, ##, ###)
  const sectionHeaders: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headerMatch = line.match(/^(#{1,3})\s+/);
    if (headerMatch) {
      const headerLevel = headerMatch[1].length;
      sectionHeaders.push(line);
      // Inclui primeiros 500 caracteres após cada header principal
      let sectionContent = '';
      let sectionCharCount = 0;
      for (let j = i + 1; j < lines.length && sectionCharCount < 500; j++) {
        const nextLine = lines[j];
        const nextLineTrimmed = nextLine.trim();
        // Para no próximo header de nível igual ou superior
        const nextHeaderMatch = nextLineTrimmed.match(/^(#{1,3})\s+/);
        if (nextHeaderMatch && nextHeaderMatch[1].length <= headerLevel) {
          break;
        }
        sectionCharCount += nextLine.length + 1;
        sectionContent += nextLine + '\n';
      }
      if (sectionContent.trim()) {
        sectionHeaders.push(sectionContent.trim());
      }
    }
  }
  
  if (sectionHeaders.length > 0) {
    extracted.push('\n## Estrutura de Seções:\n');
    extracted.push(sectionHeaders.join('\n\n'));
  }
  
  // 3. Últimos 2000-3000 caracteres (conclusão, pedidos)
  const footerChars = 3000;
  let footerContent = '';
  charCount = 0;
  
  for (let i = lines.length - 1; i > headerEndLine && charCount < footerChars; i--) {
    const line = lines[i];
    charCount += line.length + 1;
    footerContent = line + '\n' + footerContent;
  }
  
  if (footerContent.trim()) {
    extracted.push('\n## Conclusão/Pedidos:\n');
    extracted.push(footerContent.trim());
  }
  
  const result = extracted.join('\n\n');
  
  // Se o resultado ainda for muito grande, aplica truncamento adicional
  const resultTokens = estimateTokens(result);
  if (resultTokens > MAX_INPUT_TOKENS * 0.8) {
    return truncateMarkdown(result, Math.floor(MAX_INPUT_TOKENS * 0.8));
  }
  
  return result;
}

/**
 * Trunca markdown de forma inteligente, mantendo início e fim
 */
function truncateMarkdown(markdown: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(markdown);
  
  if (estimatedTokens <= maxTokens) {
    return markdown;
  }

  // Calcula quantos caracteres podemos manter
  const maxChars = maxTokens * 4;
  const halfChars = Math.floor(maxChars / 2);
  
  // Mantém início e fim, removendo o meio
  const start = markdown.substring(0, halfChars);
  const end = markdown.substring(markdown.length - halfChars);
  
  // Tenta encontrar um ponto de quebra natural (fim de parágrafo)
  const lastNewlineInStart = start.lastIndexOf('\n\n');
  const firstNewlineInEnd = end.indexOf('\n\n');
  
  const truncatedStart = lastNewlineInStart > 0 
    ? markdown.substring(0, lastNewlineInStart)
    : start;
  
  const truncatedEnd = firstNewlineInEnd > 0
    ? markdown.substring(markdown.length - halfChars + firstNewlineInEnd)
    : end;
  
  return `${truncatedStart}\n\n[... conteúdo truncado por tamanho ...]\n\n${truncatedEnd}`;
}

const SYSTEM_PROMPT = `Você é um especialista em classificação de documentos jurídicos brasileiros.

O documento está em Markdown. Se contiver "[... conteúdo truncado ...]", baseie-se nas partes visíveis.

Extraia:
1. **Tipo**: petição inicial, contestação, recurso, parecer, contrato, modelo genérico, ou outro
2. **Área**: civil, trabalhista, tributário, empresarial, consumidor, penal, administrativo, previdenciário, ou outro
3. **Jurisdição**: BR, TRT1, TJSP, etc.
4. **Complexidade**: simples, médio, complexo
5. **Tags**: tags relevantes (ex: danos_morais, plano_de_saude)
6. **Resumo**: 2-3 linhas otimizado para busca semântica
7. **Qualidade**: 0-100 (clareza, estrutura, risco de teses frágeis)
8. **Título**: extraia ou crie título descritivo
9. **Seções**: seções principais e seus papéis (intro, fundamentacao, pedido, fatos, direito, conclusao, outro)

Seja preciso e objetivo.`;

/**
 * Classifica um documento jurídico usando IA.
 * 
 * @param markdown - Conteúdo do documento em formato Markdown
 * @param onProgress - Callback opcional para logar progresso da classificação
 * @returns Resultado da classificação com metadados estruturados
 * 
 * @note Para logs mais detalhados (ex: progresso por campo), considere usar
 * `streamObject` do AI SDK no futuro, que permite acompanhar o progresso
 * em tempo real conforme cada campo é gerado pela IA.
 */
export async function classifyDocument(
  markdown: string,
  onProgress?: (message: string) => void
): Promise<ClassificationResult> {
  // Extrai apenas partes relevantes para classificação (reduz drasticamente tokens)
  const originalTokens = estimateTokens(markdown);
  let processedMarkdown = extractClassificationRelevantContent(markdown);
  const extractedTokens = estimateTokens(processedMarkdown);
  const tokensSaved = originalTokens - extractedTokens;
  
  if (tokensSaved > 0) {
    const savingsPercent = Math.round((tokensSaved / originalTokens) * 100);
    onProgress?.(`💰 Economia de tokens: ${tokensSaved.toLocaleString()} (${savingsPercent}%)`);
  }
  
  // Estima tokens e trunca se necessário ANTES de enviar
  const systemPromptTokens = estimateTokens(SYSTEM_PROMPT);
  const userPromptTokens = estimateTokens('Analise o documento abaixo (formato Markdown) e classifique-o conforme as instruções.\n\n---\n\n');
  const reservedTokens = systemPromptTokens + userPromptTokens + 2000; // 2000 tokens para resposta
  const availableTokens = MAX_INPUT_TOKENS - reservedTokens;
  
  const markdownTokens = estimateTokens(processedMarkdown);
  
  if (markdownTokens > availableTokens) {
    console.warn(`⚠️  Documento ainda grande após extração (${markdownTokens} tokens), truncando para ${availableTokens} tokens`);
    processedMarkdown = truncateMarkdown(processedMarkdown, availableTokens);
  }

  // Loga início da classificação
  onProgress?.('⏳ Iniciando classificação...');

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ClassificationSchema,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Analise o documento abaixo (formato Markdown) e classifique-o conforme as instruções.\n\n---\n\n${processedMarkdown}`,
        },
      ],
    });

    // Aplica valores padrão para campos que podem não ter sido retornados
    const result: ClassificationResult = {
      ...object,
      jurisdiction: object.jurisdiction || 'BR',
      tags: object.tags || [],
      sections: object.sections || [],
    };

    // Valida se a classificação não está vazia
    validateClassification(result, processedMarkdown);

    // Loga fim da classificação
    onProgress?.('✅ Classificação concluída');

    return result;
  } catch (error) {
    // Retry logic para rate limit
    if (error instanceof Error && error.message.includes('rate limit')) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return classifyDocument(markdown, onProgress);
    }
    
    // Fallback para erros de limite de tokens (mesmo após truncamento)
    if (error instanceof Error && (
      error.message.includes('maximum context length') ||
      error.message.includes('token limit') ||
      error.message.includes('context_length_exceeded') ||
      error.message.includes('too many tokens')
    )) {
      console.warn(`⚠️  Erro de limite de tokens detectado, tentando com versão mais truncada`);
      
      // Tenta com versão ainda mais truncada (50% do limite original)
      const fallbackTokens = Math.floor(availableTokens * 0.5);
      const fallbackMarkdown = truncateMarkdown(processedMarkdown, fallbackTokens);
      
      try {
        const { object } = await generateObject({
          model: openai('gpt-5'),
          schema: ClassificationSchema,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: `Analise o documento abaixo (formato Markdown) e classifique-o conforme as instruções.\n\n---\n\n${fallbackMarkdown}`,
            },
          ],
        });
        
        // Aplica valores padrão para campos que podem não ter sido retornados
        const fallbackResult: ClassificationResult = {
          ...object,
          jurisdiction: object.jurisdiction || 'BR',
          tags: object.tags || [],
          sections: object.sections || [],
        };

        // Valida se a classificação não está vazia
        validateClassification(fallbackResult, fallbackMarkdown);

        // Loga fim da classificação (fallback)
        onProgress?.('✅ Classificação concluída');

        return fallbackResult;
      } catch (fallbackError) {
        // Se ainda falhar, propaga o erro original
        throw new Error(`Falha ao classificar documento mesmo após truncamento: ${error.message}`);
      }
    }
    
    throw error;
  }
}

/**
 * Cria um TemplateDocument completo a partir da classificação e markdown
 */
export function createTemplateDocument(
  classification: ClassificationResult,
  markdown: string,
  documentFileId: string
): TemplateDocument {
  return {
    id: documentFileId,
    title: classification.title,
    docType: classification.docType,
    area: classification.area,
    jurisdiction: classification.jurisdiction,
    complexity: classification.complexity,
    tags: classification.tags,
    summary: classification.summary,
    markdown,
    metadata: {
      sections: classification.sections,
    },
    qualityScore: classification.qualityScore,
    isGold: classification.qualityScore > 60,
    isSilver: classification.qualityScore >= 56 && classification.qualityScore <= 60,
  };
}

