import { NextRequest, NextResponse } from 'next/server'
import { loadTemplateSchemaConfig } from '@/lib/services/template-schema-service'
import { generateSchemaPrompt } from '@/lib/services/schema-prompt-generator'

export const dynamic = 'force-dynamic'

/**
 * GET /api/template-schema/prompt-preview
 * Retorna o preview do prompt gerado a partir do schema de template
 * 
 * Query params:
 * - schemaId?: string (opcional) - ID do schema específico (usa ativo se não fornecido)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const schemaId = searchParams.get('schemaId') || undefined

    // Carrega schema config
    const schemaConfig = await loadTemplateSchemaConfig(schemaId)

    // Gera prompt do schema
    const prompt = generateSchemaPrompt(schemaConfig)

    return NextResponse.json({
      prompt,
      schemaName: schemaConfig.name,
      schemaId: schemaConfig.id,
    })
  } catch (error) {
    console.error('Error generating schema prompt preview:', error)
    if (error instanceof Error) {
      // Erros de schema não encontrado
      if (
        error.message.includes('não encontrado') ||
        error.message.includes('não encontrada') ||
        error.message.includes('ativa')
      ) {
        return NextResponse.json(
          { error: error.message, prompt: null },
          { status: 404 }
        )
      }
    }
    return NextResponse.json(
      { error: 'Erro ao gerar preview do prompt', prompt: null },
      { status: 500 }
    )
  }
}

