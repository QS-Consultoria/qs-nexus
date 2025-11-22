import { generateObject } from 'ai'
import { z } from 'zod'
import { TemplateDocument, TemplateDocumentSchema } from '../types/template-document'
import {
  loadClassificationConfig as loadConfigFromDB,
  type ClassificationConfig,
} from './classification-config'
import { getClassificationModelProvider, parseClassificationModel, parseModelProvider } from '../types/classification-models'
import { estimateTokensForClassificationModel, estimateTokensApproximate } from '../utils/token-estimation'
import { extractContent } from './content-extraction'
import {
  calculateAvailableTokens,
  shouldUseExtraction,
  truncateMarkdown,
} from './content-truncation'
import { buildZodSchemaFromConfig } from './schema-builder'
import { loadTemplateSchemaConfig } from './template-schema-service'

/**
 * Schema de classificação baseado no TemplateDocumentSchema
 */
const ClassificationSchema = z.object({
  docType: TemplateDocumentSchema.shape.docType,
  area: TemplateDocumentSchema.shape.area,
  jurisdiction: z.string(),
  complexity: TemplateDocumentSchema.shape.complexity,
  tags: z.array(z.string()),
  summary: z.string().describe('Resumo de 2-3 linhas otimizado para embedding'),
  qualityScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Nota de qualidade baseada em clareza, estrutura e risco'),
  title: z.string().describe('Título do documento'),
  sections: z.array(
    z.object({
      name: z.string(),
      role: z.enum(['intro', 'fundamentacao', 'pedido', 'fatos', 'direito', 'conclusao', 'outro']),
    })
  ),
})

export interface ClassificationResult {
  docType: TemplateDocument['docType']
  area: TemplateDocument['area']
  jurisdiction: string
  complexity: TemplateDocument['complexity']
  tags: string[]
  summary: string
  qualityScore: number
  title: string
  sections?: Array<{ name: string; role: string }>
}

/**
 * Valida se a classificação retornada está vazia ou inválida
 * Agora valida dinamicamente baseado no schema ativo configurado
 */
async function validateClassification(
  result: any,
  markdownPreview: string,
  schemaConfigId?: string
): Promise<void> {
  try {
    // Carrega schema ativo
    const schemaConfig = await loadTemplateSchemaConfig(schemaConfigId)
    
    // Constrói schema Zod para validação
    const validationSchema = buildZodSchemaFromConfig(schemaConfig)
    
    // Valida estrutura usando Zod
    const validationResult = validationSchema.safeParse(result)
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => {
        const path = err.path.join('.')
        return `${path}: ${err.message}`
      })
      
      const errorDetails = {
        result,
        errors,
        markdownPreview: markdownPreview.substring(0, 500) + (markdownPreview.length > 500 ? '...' : ''),
        schemaConfig: {
          id: schemaConfig.id,
          name: schemaConfig.name,
          fields: schemaConfig.fields.map(f => ({
            name: f.name,
            type: f.type,
            required: f.required !== false, // Por padrão é obrigatório
          })),
        },
      }

      console.error('\n❌ ERRO CRÍTICO: Classificação falhou na validação!')
      console.error('═══════════════════════════════════════════════════════════')
      console.error('Erros de validação:')
      console.error(JSON.stringify(errors, null, 2))
      console.error('═══════════════════════════════════════════════════════════')
      console.error('Detalhes da resposta recebida:')
      console.error(JSON.stringify(errorDetails, null, 2))
      console.error('═══════════════════════════════════════════════════════════')
      console.error('\n🛑 PARANDO CLASSIFICAÇÃO PARA DEBUG\n')

      throw new Error(
        `Classificação falhou na validação: ${errors.join('; ')}`
      )
    }
    
    // Valida campos obrigatórios que podem estar vazios (strings vazias, arrays vazios, etc)
    const missingFields: string[] = []
    
    for (const field of schemaConfig.fields) {
      const isRequired = field.required !== false // Por padrão é obrigatório
      
      if (isRequired) {
        const fieldValue = result[field.name]
        
        // Verifica se o campo está presente e não vazio
        if (fieldValue === undefined || fieldValue === null) {
          missingFields.push(`${field.name} (ausente)`)
        } else if (field.type === 'string' && typeof fieldValue === 'string' && fieldValue.trim() === '') {
          missingFields.push(`${field.name} (string vazia)`)
        } else if (field.type === 'array' && Array.isArray(fieldValue) && fieldValue.length === 0) {
          // Arrays vazios podem ser válidos dependendo do contexto, mas vamos alertar
          // Por enquanto, não vamos considerar array vazio como erro
        }
      }
    }
    
    if (missingFields.length > 0) {
      const errorDetails = {
        result,
        missingFields,
        markdownPreview: markdownPreview.substring(0, 500) + (markdownPreview.length > 500 ? '...' : ''),
        schemaConfig: {
          id: schemaConfig.id,
          name: schemaConfig.name,
          requiredFields: schemaConfig.fields
            .filter(f => f.required !== false)
            .map(f => ({ name: f.name, type: f.type })),
        },
      }

      console.error('\n❌ ERRO CRÍTICO: Classificação retornou campos obrigatórios vazios!')
      console.error('═══════════════════════════════════════════════════════════')
      console.error('Campos obrigatórios faltando ou vazios:')
      console.error(JSON.stringify(missingFields, null, 2))
      console.error('═══════════════════════════════════════════════════════════')
      console.error('Detalhes da resposta recebida:')
      console.error(JSON.stringify(errorDetails, null, 2))
      console.error('═══════════════════════════════════════════════════════════')
      console.error('\n🛑 PARANDO CLASSIFICAÇÃO PARA DEBUG\n')

      throw new Error(
        `Classificação retornou campos obrigatórios vazios: ${missingFields.join(', ')}`
      )
    }
  } catch (error) {
    // Se não conseguir carregar schema dinâmico, usa validação básica como fallback
    if (error instanceof Error && error.message.includes('não encontrado')) {
      console.warn('⚠️  Schema dinâmico não encontrado, usando validação básica como fallback')
      
      // Validação básica para campos comuns
  const isEmpty =
    !result.title ||
    result.title.trim() === '' ||
    !result.summary ||
        result.summary.trim() === ''

  if (isEmpty) {
    const errorDetails = {
          result,
          markdownPreview: markdownPreview.substring(0, 500) + (markdownPreview.length > 500 ? '...' : ''),
    }

    console.error('\n❌ ERRO CRÍTICO: Classificação retornou dados vazios!')
    console.error('═══════════════════════════════════════════════════════════')
    console.error('Detalhes da resposta recebida:')
    console.error(JSON.stringify(errorDetails, null, 2))
    console.error('═══════════════════════════════════════════════════════════')
    console.error('\n🛑 PARANDO CLASSIFICAÇÃO PARA DEBUG\n')

    throw new Error(
      `Classificação retornou dados vazios. ` +
            `Title: "${result.title}", Summary: "${result.summary}"`
    )
      }
    } else {
      // Propaga outros erros
      throw error
    }
  }
}

/**
 * Carrega configuração de classificação
 * Se configId não for fornecido, usa a configuração ativa
 */
export async function loadClassificationConfig(configId?: string): Promise<ClassificationConfig> {
  return await loadConfigFromDB(configId)
}

/**
 * Constrói schema Zod baseado em configuração de schema de template
 * Agora usa schema dinâmico baseado na configuração
 */
export async function buildClassificationSchema(schemaConfigId?: string): Promise<z.ZodSchema> {
  try {
    // Carrega configuração de schema de template
    const schemaConfig = await loadTemplateSchemaConfig(schemaConfigId)
    
    // Constrói schema Zod dinamicamente
    return buildZodSchemaFromConfig(schemaConfig)
  } catch (error) {
    // Fallback para schema fixo se não conseguir carregar schema dinâmico
    console.warn('Erro ao carregar schema dinâmico, usando schema fixo:', error)
    return ClassificationSchema
  }
}

/**
 * Prepara conteúdo markdown para classificação
 * Aplica extração e truncamento conforme necessário
 */
export async function prepareMarkdownContent(
  markdown: string,
  config: ClassificationConfig
): Promise<string> {
  // Estima tokens do documento completo
  const classificationModel = parseClassificationModel(config.modelName, config.modelProvider)
  const fullDocTokens = estimateTokensForClassificationModel(markdown, classificationModel)

  // Calcula tokens disponíveis
  const systemPromptTokens = estimateTokensApproximate(config.systemPrompt)
  const userPromptBase = 'Analise o documento abaixo (formato Markdown) e classifique-o conforme as instruções.\n\n---\n\n'
  const userPromptTokens = estimateTokensApproximate(userPromptBase)
  const availableTokens = calculateAvailableTokens(
    config.maxInputTokens,
    systemPromptTokens,
    userPromptTokens,
    config.maxOutputTokens
  )

  // Decide se usa extração ou truncamento direto
  let processedMarkdown: string

  if (shouldUseExtraction(fullDocTokens, availableTokens)) {
    // Usa extração de conteúdo relevante
    processedMarkdown = extractContent(markdown, {
      customFunctionCode: config.extractionFunctionCode || undefined,
    })
  } else {
    // Usa truncamento direto se necessário
    if (fullDocTokens > availableTokens) {
      processedMarkdown = truncateMarkdown(markdown, availableTokens)
    } else {
      processedMarkdown = markdown
    }
  }

  // Verifica se ainda precisa truncar após extração
  const processedTokens = estimateTokensForClassificationModel(processedMarkdown, classificationModel)
  if (processedTokens > availableTokens) {
    processedMarkdown = truncateMarkdown(processedMarkdown, availableTokens)
  }

  return processedMarkdown
}

/**
 * Classifica um documento jurídico usando IA
 * 
 * @param markdown - Conteúdo do documento em formato Markdown
 * @param configId - ID da configuração de classificação (opcional, usa ativa se não fornecido)
 * @param onProgress - Callback opcional para logar progresso da classificação
 * @returns Resultado da classificação com metadados estruturados
 */
export interface ClassificationResultWithModel extends ClassificationResult {
  _modelProvider?: 'openai' | 'google'
  _modelName?: string
  _inputTokens?: number
  _outputTokens?: number
}

export async function classifyDocument(
  markdown: string,
  configId?: string,
  onProgress?: (message: string) => void
): Promise<(ClassificationResult | Record<string, any>) & { 
  _modelProvider?: 'openai' | 'google'
  _modelName?: string
  _inputTokens?: number
  _outputTokens?: number
}> {
  // Carrega configuração
  const config = await loadConfigFromDB(configId)

  // Prepara conteúdo
  const originalTokens = estimateTokensApproximate(markdown)
  const processedMarkdown = await prepareMarkdownContent(markdown, config)
  const processedTokens = estimateTokensApproximate(processedMarkdown)
  const tokensSaved = originalTokens - processedTokens

  if (tokensSaved > 0) {
    const savingsPercent = Math.round((tokensSaved / originalTokens) * 100)
    onProgress?.(`💰 Economia de tokens: ${tokensSaved.toLocaleString()} (${savingsPercent}%)`)
  }

  // Obtém provider do modelo
  const classificationModel = parseClassificationModel(config.modelName, config.modelProvider)
  const { model } = getClassificationModelProvider(classificationModel)

  // Log de debug: mostra provider e model usado
  const DEBUG = process.env.DEBUG === 'true'
  if (DEBUG) {
    console.log(`[CLASSIFIER] Provider: ${config.modelProvider}`)
    console.log(`[CLASSIFIER] Model: ${config.modelName}`)
    console.log(`[CLASSIFIER] Classification Model: ${classificationModel}`)
  }

  // Carrega schema config para obter o ID (necessário para validação)
  let schemaConfigId: string | undefined
  try {
    const schemaConfig = await loadTemplateSchemaConfig()
    schemaConfigId = schemaConfig.id
  } catch (error) {
    console.warn('⚠️  Não foi possível carregar schema config para validação:', error)
  }

  // Constrói schema dinâmico baseado no schema config do template
  // Tenta usar o schema do template associado, se disponível
  // Por enquanto, usa schema padrão (será melhorado na Fase 4 com API)
  const classificationSchema = await buildClassificationSchema(schemaConfigId)

  // Loga início da classificação
  onProgress?.('⏳ Iniciando classificação...')

  try {
    const response = await generateObject({
      model,
      schema: classificationSchema,
      messages: [
        {
          role: 'system',
          content: config.systemPrompt,
        },
        {
          role: 'user',
          content: `Analise o documento abaixo (formato Markdown) e classifique-o conforme as instruções.\n\n---\n\n${processedMarkdown}`,
        },
      ],
    })

    const { object, usage } = response

    // Log de debug: mostra tokens usados
    if (DEBUG && usage) {
      console.log(`[CLASSIFIER] Input tokens: ${usage.promptTokens}`)
      console.log(`[CLASSIFIER] Output tokens: ${usage.completionTokens}`)
      console.log(`[CLASSIFIER] Total tokens: ${usage.totalTokens || (usage.promptTokens + usage.completionTokens)}`)
    }

    // Resultado da classificação (pode ser dinâmico baseado no schema)
    // Aplica valores padrão apenas se o schema ainda usar esses campos
    const result: any = { ...object }
    
    // Valores padrão para compatibilidade com código legado (se campos existirem no schema)
    if ('jurisdiction' in object && !object.jurisdiction) {
      result.jurisdiction = 'BR'
    }
    if ('tags' in object && !object.tags) {
      result.tags = []
    }
    if ('sections' in object && !object.sections) {
      result.sections = []
    }

    // Valida se a classificação não está vazia usando schema dinâmico
    await validateClassification(result, processedMarkdown, schemaConfigId)

    // Loga fim da classificação
    onProgress?.('✅ Classificação concluída')

    // Adiciona informações do modelo e tokens ao resultado
    return {
      ...result,
      _modelProvider: config.modelProvider,
      _modelName: config.modelName,
      _inputTokens: usage?.promptTokens,
      _outputTokens: usage?.completionTokens,
    }
  } catch (error) {
    // Retry logic para rate limit
    if (error instanceof Error && error.message.includes('rate limit')) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      return classifyDocument(markdown, configId, onProgress)
    }

    // Fallback para erros de limite de tokens (mesmo após truncamento)
    if (
      error instanceof Error &&
      (error.message.includes('maximum context length') ||
        error.message.includes('token limit') ||
        error.message.includes('context_length_exceeded') ||
        error.message.includes('too many tokens'))
    ) {
      console.warn(`⚠️  Erro de limite de tokens detectado, tentando com versão mais truncada`)

      // Tenta com versão ainda mais truncada (50% do limite original)
      const availableTokens = calculateAvailableTokens(
        config.maxInputTokens,
        estimateTokensApproximate(config.systemPrompt),
        estimateTokensApproximate('Analise o documento abaixo (formato Markdown) e classifique-o conforme as instruções.\n\n---\n\n'),
        config.maxOutputTokens
      )
      const fallbackTokens = Math.floor(availableTokens * 0.5)
      const fallbackMarkdown = truncateMarkdown(processedMarkdown, fallbackTokens)

      try {
        const fallbackResponse = await generateObject({
          model,
          schema: classificationSchema,
          messages: [
            {
              role: 'system',
              content: config.systemPrompt,
            },
            {
              role: 'user',
              content: `Analise o documento abaixo (formato Markdown) e classifique-o conforme as instruções.\n\n---\n\n${fallbackMarkdown}`,
            },
          ],
        })

        const { object, usage: fallbackUsage } = fallbackResponse

        // Log de debug: mostra tokens usados (fallback)
        if (DEBUG && fallbackUsage) {
          console.log(`[CLASSIFIER] Fallback - Input tokens: ${fallbackUsage.promptTokens}`)
          console.log(`[CLASSIFIER] Fallback - Output tokens: ${fallbackUsage.completionTokens}`)
          console.log(`[CLASSIFIER] Fallback - Total tokens: ${fallbackUsage.totalTokens || (fallbackUsage.promptTokens + fallbackUsage.completionTokens)}`)
        }

        // Resultado da classificação (pode ser dinâmico baseado no schema)
        // Aplica valores padrão apenas se o schema ainda usar esses campos
        const fallbackResult: any = { ...object }
        
        // Valores padrão para compatibilidade com código legado (se campos existirem no schema)
        if ('jurisdiction' in object && !object.jurisdiction) {
          fallbackResult.jurisdiction = 'BR'
        }
        if ('tags' in object && !object.tags) {
          fallbackResult.tags = []
        }
        if ('sections' in object && !object.sections) {
          fallbackResult.sections = []
        }

        // Valida se a classificação não está vazia usando schema dinâmico
        await validateClassification(fallbackResult, fallbackMarkdown, schemaConfigId)

        // Loga fim da classificação (fallback)
        onProgress?.('✅ Classificação concluída')

        // Adiciona informações do modelo e tokens ao resultado
        return {
          ...fallbackResult,
          _modelProvider: config.modelProvider,
          _modelName: config.modelName,
          _inputTokens: fallbackUsage?.promptTokens,
          _outputTokens: fallbackUsage?.completionTokens,
        }
      } catch (fallbackError) {
        // Se ainda falhar, propaga o erro original
        throw new Error(`Falha ao classificar documento mesmo após truncamento: ${error.message}`)
      }
    }

    throw error
  }
}

/**
 * Cria um TemplateDocument completo a partir da classificação e markdown
 * Agora aceita resultado dinâmico baseado no schema configurado
 * 
 * @param classification - Resultado da classificação
 * @param markdown - Conteúdo markdown do documento
 * @param documentFileId - ID do arquivo de documento
 * @param modelProvider - Provider usado na classificação (openai, google)
 * @param modelName - Nome do modelo usado na classificação
 * @param inputTokens - Número de tokens de input usados
 * @param outputTokens - Número de tokens de output usados
 */
export function createTemplateDocument(
  classification: ClassificationResult | Record<string, any>,
  markdown: string,
  documentFileId: string,
  modelProvider?: 'openai' | 'google',
  modelName?: string,
  inputTokens?: number,
  outputTokens?: number
): TemplateDocument & { 
  modelProvider?: 'openai' | 'google'
  modelName?: string
  inputTokens?: number
  outputTokens?: number
} {
  // Extrai campos de forma segura (com fallback para valores padrão)
  const title = (classification as any).title || ''
  const docType = (classification as any).docType || 'outro'
  const area = (classification as any).area || 'outro'
  const jurisdiction = (classification as any).jurisdiction || 'BR'
  const complexity = (classification as any).complexity || 'medio'
  const tags = Array.isArray((classification as any).tags) ? (classification as any).tags : []
  const summary = (classification as any).summary || ''
  const qualityScore = typeof (classification as any).qualityScore === 'number' 
    ? (classification as any).qualityScore 
    : undefined
  const sections = Array.isArray((classification as any).sections) 
    ? (classification as any).sections 
    : undefined

  // Extrai outros campos dinâmicos que não são parte do TemplateDocument base
  // mas que devem ir para metadata
  const dynamicMetadata: Record<string, any> = { sections }
  
  // Adiciona outros campos que não são parte do schema base
  const baseFields = ['title', 'docType', 'area', 'jurisdiction', 'complexity', 'tags', 'summary', 'qualityScore', 'sections']
  for (const [key, value] of Object.entries(classification)) {
    if (!baseFields.includes(key)) {
      dynamicMetadata[key] = value
    }
  }

  return {
    id: documentFileId,
    title,
    docType: docType as TemplateDocument['docType'],
    area: area as TemplateDocument['area'],
    jurisdiction,
    complexity: complexity as TemplateDocument['complexity'],
    tags,
    summary,
    markdown,
    metadata: dynamicMetadata,
    qualityScore,
    isGold: qualityScore !== undefined && qualityScore > 60,
    isSilver: qualityScore !== undefined && qualityScore >= 56 && qualityScore <= 60,
    modelProvider,
    modelName,
    inputTokens,
    outputTokens,
  }
}
