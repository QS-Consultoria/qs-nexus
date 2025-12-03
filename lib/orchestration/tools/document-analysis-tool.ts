/**
 * Document Analysis Tool
 * Análise de documentos fiscais e contábeis com LLM
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { createLLM } from '../langchain-config'
import { db } from '@/lib/db'
import { documentFiles, templates } from '@/lib/db/schema/rag'
import { spedFiles } from '@/lib/db/schema/sped'
import { eq, and } from 'drizzle-orm'

/**
 * Schema de input do tool
 */
const DocumentAnalysisSchema = z.object({
  documentId: z.string().uuid().describe('ID do documento ou arquivo SPED'),
  analysisType: z.enum(['summary', 'key_points', 'anomalies', 'compliance']).describe('Tipo de análise'),
  organizationId: z.string().uuid().describe('ID da organização'),
  specificQuestions: z.array(z.string()).optional().describe('Perguntas específicas sobre o documento'),
})

/**
 * Busca conteúdo do documento
 */
async function getDocumentContent(
  documentId: string,
  organizationId: string
): Promise<{ content: string; metadata: any } | null> {
  // Tentar buscar como documento RAG
  const docFiles = await db
    .select()
    .from(documentFiles)
    .where(
      and(
        eq(documentFiles.id, documentId),
        eq(documentFiles.organizationId, organizationId)
      )
    )
    .limit(1)

  if (docFiles.length > 0) {
    // Buscar templates associados
    const templ = await db
      .select()
      .from(templates)
      .where(eq(templates.fileId, documentId))
      .limit(1)

    if (templ.length > 0) {
      return {
        content: templ[0].contentMarkdown || '',
        metadata: {
          fileName: docFiles[0].fileName,
          type: 'document',
          ...(templ[0].metadata as any),
        },
      }
    }
  }

  // Tentar buscar como arquivo SPED
  const spedFilesData = await db
    .select()
    .from(spedFiles)
    .where(
      and(
        eq(spedFiles.id, documentId),
        eq(spedFiles.organizationId, organizationId)
      )
    )
    .limit(1)

  if (spedFilesData.length > 0) {
    const sped = spedFilesData[0]
    return {
      content: `Arquivo SPED ${sped.fileType.toUpperCase()}
CNPJ: ${sped.cnpj}
Empresa: ${sped.companyName}
Período: ${sped.periodStart} a ${sped.periodEnd}
Status: ${sped.status}
Total de registros: ${sped.totalRecords}
Registros processados: ${sped.processedRecords}`,
      metadata: {
        fileName: sped.fileName,
        type: 'sped',
        fileType: sped.fileType,
        cnpj: sped.cnpj,
        companyName: sped.companyName,
      },
    }
  }

  return null
}

/**
 * Gera prompt baseado no tipo de análise
 */
function getAnalysisPrompt(
  analysisType: string,
  content: string,
  metadata: any,
  specificQuestions?: string[]
): string {
  const baseContext = `Você é um especialista em análise de documentos fiscais e contábeis.

Documento: ${metadata.fileName}
Tipo: ${metadata.type}

Conteúdo:
${content.substring(0, 10000)}${content.length > 10000 ? '\n\n[Conteúdo truncado...]' : ''}
`

  switch (analysisType) {
    case 'summary':
      return `${baseContext}

Por favor, forneça um resumo executivo deste documento, destacando:
1. Objetivo principal
2. Informações-chave
3. Valores ou datas relevantes
4. Pontos de atenção`

    case 'key_points':
      return `${baseContext}

Liste os pontos-chave e informações mais importantes deste documento de forma estruturada.`

    case 'anomalies':
      return `${baseContext}

Analise o documento em busca de:
1. Inconsistências ou anomalias
2. Valores atípicos
3. Informações faltantes ou incompletas
4. Possíveis erros ou irregularidades

Seja específico e cite exemplos quando encontrar problemas.`

    case 'compliance':
      return `${baseContext}

Avalie a conformidade deste documento com requisitos fiscais e contábeis brasileiros:
1. Completude das informações obrigatórias
2. Conformidade com normas contábeis
3. Aspectos tributários relevantes
4. Recomendações de adequação`

    default:
      let prompt = baseContext
      if (specificQuestions && specificQuestions.length > 0) {
        prompt += `\n\nResponda às seguintes perguntas sobre o documento:\n`
        specificQuestions.forEach((q, i) => {
          prompt += `${i + 1}. ${q}\n`
        })
      }
      return prompt
  }
}

/**
 * Tool para análise de documentos
 */
export const documentAnalysisTool = new DynamicStructuredTool({
  name: 'document_analysis',
  description: `Analisa documentos fiscais, contábeis e legais usando IA.

Tipos de análise disponíveis:
- summary: Resumo executivo do documento
- key_points: Pontos-chave e informações principais
- anomalies: Detecção de inconsistências e anomalias
- compliance: Avaliação de conformidade fiscal/contábil

Útil para:
- Revisar documentos SPED
- Analisar contratos e documentos jurídicos
- Identificar problemas em demonstrações contábeis
- Validar conformidade fiscal`,
  
  schema: DocumentAnalysisSchema,
  
  func: async ({ documentId, analysisType, organizationId, specificQuestions }) => {
    try {
      // Buscar documento
      const doc = await getDocumentContent(documentId, organizationId)
      
      if (!doc) {
        return JSON.stringify({
          success: false,
          error: 'Documento não encontrado ou acesso negado',
        })
      }

      // Gerar prompt
      const prompt = getAnalysisPrompt(
        analysisType,
        doc.content,
        doc.metadata,
        specificQuestions
      )

      // Criar LLM
      const llm = createLLM({
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.3,
      })

      // Executar análise
      const response = await llm.invoke(prompt)
      
      return JSON.stringify({
        success: true,
        documentId,
        analysisType,
        analysis: response.content,
        metadata: {
          fileName: doc.metadata.fileName,
          type: doc.metadata.type,
        },
      }, null, 2)
    } catch (error) {
      console.error('Erro na análise de documento:', error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  },
})

