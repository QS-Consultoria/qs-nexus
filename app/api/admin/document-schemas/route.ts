import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { documentSchemas, type DocumentSchemaField } from '@/lib/db/schema/document-schemas'
import { 
  validateDocumentSchema, 
  createDynamicTable,
  listDocumentSchemas 
} from '@/lib/services/schema-migration-engine'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/admin/document-schemas
 * Lista todos os schemas de documento da organização
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const baseType = searchParams.get('baseType') || undefined
    
    const schemas = await listDocumentSchemas(
      session.user.organizationId,
      baseType
    )
    
    return NextResponse.json({ schemas })
    
  } catch (error: any) {
    console.error('[API] Erro ao listar schemas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar schemas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/document-schemas
 * Cria um novo schema de documento + tabela SQL
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    // TODO: Validar se usuário é admin
    
    const body = await request.json()
    const { 
      name, 
      description,
      baseType, 
      category,
      tableName, 
      fields,
      enableRAG,
      aiSystemPrompt,
      aiModelProvider,
      aiModelName,
      aiTemperature,
      isDefaultForBaseType
    } = body
    
    console.log('[API] Criando schema:', { name, tableName, baseType })
    
    // Validar schema
    const validationErrors = validateDocumentSchema(
      { name, tableName, baseType },
      fields as DocumentSchemaField[]
    )
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Erros de validação', 
          validationErrors 
        },
        { status: 400 }
      )
    }
    
    // Verificar se tabela já existe
    const [existing] = await db
      .select()
      .from(documentSchemas)
      .where(
        and(
          eq(documentSchemas.organizationId, session.user.organizationId),
          eq(documentSchemas.tableName, tableName)
        )
      )
      .limit(1)
    
    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um schema com este nome de tabela' },
        { status: 400 }
      )
    }
    
    // Criar registro do schema
    const [newSchema] = await db
      .insert(documentSchemas)
      .values({
        organizationId: session.user.organizationId,
        name,
        description,
        baseType,
        category,
        tableName,
        fields: fields as any,
        enableRAG: enableRAG ?? true,
        aiSystemPrompt,
        aiModelProvider: aiModelProvider || 'openai',
        aiModelName: aiModelName || 'gpt-4',
        aiTemperature: aiTemperature || '0.10',
        isDefaultForBaseType: isDefaultForBaseType ?? false,
        isActive: true,
        sqlTableCreated: false,
        createdBy: session.user.id,
      })
      .returning()
    
    console.log('[API] Schema criado:', newSchema.id)
    
    // Criar tabela SQL
    const result = await createDynamicTable(
      newSchema.id,
      session.user.organizationId,
      session.user.id
    )
    
    if (!result.success) {
      // Rollback: deletar schema criado
      await db
        .delete(documentSchemas)
        .where(eq(documentSchemas.id, newSchema.id))
      
      return NextResponse.json(
        { error: result.error || 'Erro ao criar tabela SQL' },
        { status: 500 }
      )
    }
    
    console.log('[API] ✅ Tabela SQL criada:', result.tableName)
    
    return NextResponse.json({ 
      success: true, 
      schema: newSchema,
      tableName: result.tableName 
    })
    
  } catch (error: any) {
    console.error('[API] ❌ Erro ao criar schema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar schema' },
      { status: 500 }
    )
  }
}

