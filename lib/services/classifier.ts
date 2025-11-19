import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { TemplateDocument, TemplateDocumentSchema } from '../types/template-document.js';

const ClassificationSchema = z.object({
  docType: TemplateDocumentSchema.shape.docType,
  area: TemplateDocumentSchema.shape.area,
  jurisdiction: z.string().default('BR'),
  complexity: TemplateDocumentSchema.shape.complexity,
  tags: z.array(z.string()).default([]),
  summary: z.string().describe('Resumo de 2-3 linhas otimizado para embedding'),
  qualityScore: z.number().min(0).max(100).describe('Nota de qualidade baseada em clareza, estrutura e risco'),
  title: z.string().describe('Título do documento'),
  sections: z.array(z.object({
    name: z.string(),
    role: z.enum(['intro', 'fundamentacao', 'pedido', 'fatos', 'direito', 'conclusao', 'outro']),
  })).optional(),
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

const SYSTEM_PROMPT = `Você é um especialista em classificação de documentos jurídicos brasileiros.

Analise o documento fornecido e extraia as seguintes informações:

1. **Tipo de documento**: Identifique o tipo de peça jurídica (petição inicial, contestação, recurso, parecer, contrato, modelo genérico, ou outro)

2. **Área de direito**: Classifique a área (civil, trabalhista, tributário, empresarial, consumidor, penal, administrativo, previdenciário, ou outro)

3. **Jurisdição**: Identifique a jurisdição (BR, TRT1, TJSP, etc.)

4. **Complexidade**: Avalie a complexidade (simples, médio, complexo)

5. **Tags**: Extraia tags relevantes (ex: danos_morais, plano_de_saude, etc.)

6. **Resumo**: Crie um resumo conciso de 2-3 linhas que capture a essência do documento, otimizado para busca semântica

7. **Qualidade**: Avalie a qualidade do documento (0-100) considerando:
   - Clareza da redação
   - Estrutura do documento
   - Risco de teses frágeis (quanto maior o risco, menor a nota)

8. **Título**: Extraia ou crie um título descritivo

9. **Seções**: Identifique as seções principais do documento e seus papéis

Use apenas as informações presentes no documento. Seja preciso e objetivo.`;

export async function classifyDocument(
  markdown: string,
  maxChars: number = 12000
): Promise<ClassificationResult> {
  // Limita o tamanho do texto para a API
  const truncatedMarkdown = markdown.length > maxChars 
    ? markdown.substring(0, maxChars) + '\n\n[... documento truncado ...]'
    : markdown;

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ClassificationSchema,
      prompt: `${SYSTEM_PROMPT}\n\nDocumento:\n\n${truncatedMarkdown}`,
    });

    return object;
  } catch (error) {
    // Retry logic
    if (error instanceof Error && error.message.includes('rate limit')) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return classifyDocument(markdown, maxChars);
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

