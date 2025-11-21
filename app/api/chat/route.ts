import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { searchSimilarChunks } from '@/lib/services/rag-search'
import { auth } from '@/lib/auth/config'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Constrói contexto RAG a partir de chunks similares
 */
function buildRAGContext(
  chunks: Array<{
    contentMarkdown: string
    templateTitle: string
    templateArea: string
    templateDocType: string
    section: string | null
    role: string | null
    similarity: number
  }>
): string {
  if (chunks.length === 0) {
    return 'Nenhum documento relevante encontrado na base de conhecimento.'
  }

  const contextParts = chunks.map((chunk, index) => {
    const sectionInfo = chunk.section ? ` (Seção: ${chunk.section})` : ''
    const roleInfo = chunk.role ? ` [${chunk.role}]` : ''

    return `
[Documento ${index + 1}]
Título: ${chunk.templateTitle}
Área: ${chunk.templateArea}
Tipo: ${chunk.templateDocType}${sectionInfo}${roleInfo}
Similaridade: ${(chunk.similarity * 100).toFixed(1)}%

Conteúdo:
${chunk.contentMarkdown}
`
  })

  return contextParts.join('\n---\n')
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    
    // Suporta tanto o formato do AI SDK (messages) quanto o formato customizado (message + history)
    let message: string
    let history: ChatMessage[] = []
    
    if (body.messages && Array.isArray(body.messages)) {
      // Formato do AI SDK: array de mensagens
      const messages = body.messages as Array<{ role: string; content: string }>
      if (messages.length === 0) {
        return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
      }
      
      // A última mensagem é a mensagem atual do usuário
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role !== 'user' || !lastMessage.content) {
        return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
      }
      
      message = lastMessage.content
      // Converte o histórico para o formato esperado
      history = messages.slice(0, -1).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))
    } else if (body.message) {
      // Formato customizado: message + history
      message = body.message
      history = body.history || []
    } else {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
    }

    // Busca chunks relevantes (reduzido minSimilarity de 0.7 para 0.5 para encontrar mais resultados)
    const chunks = await searchSimilarChunks(message, 10, 0.5)

    // Log detalhado do que foi encontrado
    console.log('\n=== RAG SEARCH RESULTS ===')
    console.log(`Query: "${message}"`)
    console.log(`Chunks encontrados: ${chunks.length}`)
    
    if (chunks.length > 0) {
      console.log('\nDocumentos encontrados:')
      chunks.forEach((chunk, idx) => {
        console.log(`\n[${idx + 1}] ${chunk.templateTitle}`)
        console.log(`   Área: ${chunk.templateArea}`)
        console.log(`   Tipo: ${chunk.templateDocType}`)
        console.log(`   Similaridade: ${(chunk.similarity * 100).toFixed(1)}%`)
        console.log(`   Preview: ${chunk.contentMarkdown.substring(0, 100)}...`)
      })
    } else {
      console.log('⚠️  Nenhum chunk encontrado com similaridade >= 0.5')
    }

    // Constrói contexto RAG
    const ragContext = buildRAGContext(chunks)
    
    console.log('\n=== RAG CONTEXT ===')
    console.log(`Tamanho do contexto: ${ragContext.length} caracteres`)
    console.log(`Preview do contexto:\n${ragContext.substring(0, 500)}...`)
    console.log('===================\n')

    // Constrói histórico de conversa
    const conversationHistory = history
      .slice(-6) // Últimas 6 mensagens
      .map(
        (msg: ChatMessage) => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`
      )
      .join('\n')

    // Prompt do sistema
    const systemPrompt = `Você é um assistente jurídico especializado em ajudar com documentos legais brasileiros.

Sua função é responder perguntas baseando-se nos documentos fornecidos no contexto abaixo.

INSTRUÇÕES:
- Use as informações dos documentos fornecidos no contexto para responder
- Quando o usuário perguntar sobre estruturas de documentos, tipos de petições, ou modelos, identifique nos documentos qual estrutura/tipo/modelo é mais adequado
- Cite os documentos quando fizer referências (ex: "Segundo o Documento 1...", "O Documento 2 indica que...")
- Se houver múltiplos documentos relevantes, compare e sugira o mais adequado
- Se não houver informação relevante no contexto, informe ao usuário de forma clara
- Responda em português brasileiro
- Seja claro, objetivo e profissional
- Mantenha o contexto jurídico e formal quando apropriado
- Quando o usuário perguntar sobre qual documento usar, indique o tipo, área e estrutura baseado nos documentos disponíveis

CONTEXTO DE DOCUMENTOS:
${ragContext}`

    // Prompt do usuário
    const userPrompt = conversationHistory
      ? `${conversationHistory}\n\nUsuário: ${message}`
      : message

    console.log('\n=== PROMPT ENVIADO AO LLM ===')
    console.log(`System Prompt (primeiros 500 chars):\n${systemPrompt.substring(0, 500)}...`)
    console.log(`\nUser Prompt:\n${userPrompt}`)
    console.log('=============================\n')

    // Gera resposta com streaming
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 1000,
    })

    // Retorna stream
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json({ error: 'Erro ao processar mensagem' }, { status: 500 })
  }
}
