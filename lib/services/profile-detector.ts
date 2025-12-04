import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { db } from '../db'
import { documentSchemas, type DocumentSchema } from '../db/schema/document-schemas'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

/**
 * Profile Detector - Auto-detecção de Schema de Documento
 * 
 * Analisa o conteúdo de um documento e sugere automaticamente
 * qual Schema de Documento (classification profile) usar.
 */

// ================================================================
// Tipos
// ================================================================

export type DetectionConfidence = 'high' | 'medium' | 'low'

export interface ProfileDetectionResult {
  suggestedSchema: DocumentSchema | null
  otherSchemas: DocumentSchema[]
  confidence: DetectionConfidence
  reasoning?: string  // Por que a IA escolheu este schema
  category?: 'juridico' | 'contabil' | 'geral'
}

// ================================================================
// Função Principal: Detectar Schema
// ================================================================

export async function detectDocumentSchema(
  content: string,  // Primeiras ~2000 palavras do documento (Markdown)
  organizationId: string,
  baseType: 'document' | 'sped' | 'csv'
): Promise<ProfileDetectionResult> {
  try {
    console.log(`[PROFILE-DETECTOR] Detectando schema para baseType: ${baseType}`)
    
    // 1. Buscar schemas ativos da organização para este baseType
    const schemas = await db
      .select()
      .from(documentSchemas)
      .where(
        and(
          eq(documentSchemas.organizationId, organizationId),
          eq(documentSchemas.baseType, baseType),
          eq(documentSchemas.isActive, true),
          eq(documentSchemas.sqlTableCreated, true)  // Apenas schemas com tabelas criadas
        )
      )
    
    console.log(`[PROFILE-DETECTOR] Encontrados ${schemas.length} schemas ativos`)
    
    // Caso especial: Se não há schemas, retornar vazio
    if (schemas.length === 0) {
      return {
        suggestedSchema: null,
        otherSchemas: [],
        confidence: 'low',
        reasoning: 'Nenhum schema ativo encontrado para este tipo de documento'
      }
    }
    
    // Caso especial: Se há apenas 1 schema, usar automaticamente
    if (schemas.length === 1) {
      return {
        suggestedSchema: schemas[0],
        otherSchemas: [],
        confidence: 'high',
        reasoning: 'Único schema disponível para este tipo de documento'
      }
    }
    
    // Caso especial: Se há um schema padrão, usar ele
    const defaultSchema = schemas.find(s => s.isDefaultForBaseType)
    if (defaultSchema && schemas.length <= 3) {
      // Se há poucos schemas, usar o padrão com alta confiança
      return {
        suggestedSchema: defaultSchema,
        otherSchemas: schemas.filter(s => s.id !== defaultSchema.id),
        confidence: 'high',
        reasoning: 'Schema padrão da organização'
      }
    }
    
    // 2. Usar IA para detectar qual schema é mais adequado
    const aiDetection = await detectWithAI(content, schemas)
    
    return aiDetection
    
  } catch (error: any) {
    console.error('[PROFILE-DETECTOR] ❌ Erro na detecção:', error)
    
    return {
      suggestedSchema: null,
      otherSchemas: [],
      confidence: 'low',
      reasoning: `Erro na detecção: ${error.message}`
    }
  }
}

// ================================================================
// Detecção com IA
// ================================================================

const detectionSchema = z.object({
  schemaName: z.string().describe('Nome do schema mais adequado'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Nível de confiança'),
  reasoning: z.string().describe('Por que este schema foi escolhido'),
  category: z.enum(['juridico', 'contabil', 'geral']).optional(),
})

async function detectWithAI(
  content: string,
  schemas: DocumentSchema[]
): Promise<ProfileDetectionResult> {
  try {
    // Preparar lista de schemas para a IA
    const schemaDescriptions = schemas.map(s => ({
      name: s.name,
      description: s.description || 'Sem descrição',
      category: s.category,
      fields: (s.fields as any[]).map(f => f.displayName).join(', ')
    }))
    
    // Limitar conteúdo a ~2000 palavras
    const sample = content.split(/\s+/).slice(0, 2000).join(' ')
    
    const prompt = `Você é um especialista em classificação de documentos.

Analise o conteúdo abaixo e identifique qual schema de documento é mais adequado.

SCHEMAS DISPONÍVEIS:
${schemaDescriptions.map((s, i) => `${i + 1}. ${s.name}
   Categoria: ${s.category || 'geral'}
   Campos: ${s.fields}
   Descrição: ${s.description}`).join('\n\n')}

CONTEÚDO DO DOCUMENTO:
${sample}

Escolha o schema mais adequado e explique sua escolha.`

    const model = openai('gpt-4-turbo')
    
    const { object: result } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em análise e classificação de documentos. Responda em JSON estruturado.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      experimental_output: detectionSchema,
      temperature: 0.1,
    })
    
    console.log('[PROFILE-DETECTOR] IA retornou:', result)
    
    // Encontrar schema correspondente
    const suggestedSchema = schemas.find(s => 
      s.name.toLowerCase() === result.schemaName.toLowerCase()
    )
    
    if (!suggestedSchema) {
      // IA retornou nome inválido, usar schema padrão
      const defaultSchema = schemas.find(s => s.isDefaultForBaseType) || schemas[0]
      return {
        suggestedSchema: defaultSchema,
        otherSchemas: schemas.filter(s => s.id !== defaultSchema.id),
        confidence: 'low',
        reasoning: 'IA retornou schema inválido, usando padrão'
      }
    }
    
    return {
      suggestedSchema,
      otherSchemas: schemas.filter(s => s.id !== suggestedSchema.id),
      confidence: result.confidence,
      reasoning: result.reasoning,
      category: result.category
    }
    
  } catch (error: any) {
    console.error('[PROFILE-DETECTOR] ❌ Erro na IA:', error)
    
    // Fallback: usar schema padrão
    const defaultSchema = schemas.find(s => s.isDefaultForBaseType) || schemas[0]
    return {
      suggestedSchema: defaultSchema,
      otherSchemas: schemas.filter(s => s.id !== defaultSchema?.id),
      confidence: 'low',
      reasoning: `Erro na detecção com IA, usando schema padrão: ${error.message}`
    }
  }
}

// ================================================================
// Detecção por Palavras-Chave (Fallback Rápido)
// ================================================================

export function detectByKeywords(
  content: string,
  schemas: DocumentSchema[]
): ProfileDetectionResult {
  // Heurísticas simples baseadas em palavras-chave
  const contentLower = content.toLowerCase()
  
  const scores = schemas.map(schema => {
    let score = 0
    
    // Pontuação por categoria
    if (schema.category === 'juridico') {
      if (contentLower.includes('contrat')) score += 3
      if (contentLower.includes('cláusula')) score += 2
      if (contentLower.includes('parte')) score += 1
      if (contentLower.includes('assinatura')) score += 1
      if (contentLower.includes('advogad')) score += 2
      if (contentLower.includes('petição')) score += 2
      if (contentLower.includes('process')) score += 1
    }
    
    if (schema.category === 'contabil') {
      if (contentLower.includes('nota fiscal')) score += 5
      if (contentLower.includes('nf-e')) score += 5
      if (contentLower.includes('sped')) score += 4
      if (contentLower.includes('balanço')) score += 3
      if (contentLower.includes('ativo')) score += 1
      if (contentLower.includes('passivo')) score += 1
      if (contentLower.includes('receita')) score += 1
      if (contentLower.includes('despesa')) score += 1
      if (contentLower.includes('cnpj')) score += 2
    }
    
    // Pontuação por nome do schema
    const schemaNameWords = schema.name.toLowerCase().split(/\s+/)
    schemaNameWords.forEach(word => {
      if (word.length > 3 && contentLower.includes(word)) {
        score += 2
      }
    })
    
    return { schema, score }
  })
  
  // Ordenar por pontuação
  scores.sort((a, b) => b.score - a.score)
  
  const best = scores[0]
  
  let confidence: DetectionConfidence = 'low'
  if (best.score >= 5) confidence = 'high'
  else if (best.score >= 3) confidence = 'medium'
  
  return {
    suggestedSchema: best.schema,
    otherSchemas: scores.slice(1).map(s => s.schema),
    confidence,
    reasoning: `Detectado por palavras-chave (score: ${best.score})`
  }
}

