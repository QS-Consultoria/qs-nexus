import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { get_encoding } from 'tiktoken'

/**
 * Estrutura texto extraído de PDF ou .doc em markdown bem formatado usando Google Gemini
 * 
 * Esta função usa o modelo Gemini 2.0 Flash para estruturar o texto extraído,
 * adicionando títulos, parágrafos, listas e outras formatações markdown apropriadas.
 * 
 * @param rawText - Texto extraído do documento (pode ser texto simples ou markdown básico)
 * @returns Markdown bem estruturado
 */

// Encoder para contagem precisa de tokens
// Usamos cl100k_base que é compatível com modelos modernos (similar ao usado pelo Gemini)
const encoder = get_encoding('cl100k_base')

// Limite de tokens do Gemini 2.0 Flash: 1M tokens de entrada
// Vamos ser conservadores e usar 875k tokens (deixando margem para o prompt)
const MAX_TOKENS = 875_000

/**
 * Conta tokens usando tiktoken
 */
function countTokens(text: string): number {
  try {
    return encoder.encode(text).length
  } catch (error) {
    console.warn('Erro ao contar tokens com tiktoken, usando estimativa:', error)
    // Fallback para estimativa: 1 token ≈ 4 caracteres para português
    return Math.ceil(text.length / 4)
  }
}

/**
 * Trunca texto para ficar dentro do limite de tokens
 */
function truncateToMaxTokens(text: string, maxTokens: number): string {
  const tokenCount = countTokens(text)
  
  if (tokenCount <= maxTokens) {
    return text
  }

  // Trunca o texto usando busca binária para encontrar o ponto correto
  let low = 0
  let high = text.length
  let truncatedText = text

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2)
    const candidate = text.substring(0, mid)
    const candidateTokens = countTokens(candidate)

    if (candidateTokens <= maxTokens) {
      low = mid
      truncatedText = candidate
    } else {
      high = mid - 1
    }
  }

  // Garante que não exceda o limite
  while (countTokens(truncatedText) > maxTokens && truncatedText.length > 0) {
    truncatedText = truncatedText.substring(0, truncatedText.length - 1)
  }

  console.warn(
    `⚠️  Texto truncado para estruturação: ${tokenCount.toLocaleString()} tokens → ${countTokens(truncatedText).toLocaleString()} tokens ` +
      `(redução de ${((1 - countTokens(truncatedText) / tokenCount) * 100).toFixed(1)}%)`
  )

  return truncatedText + '\n\n[... texto truncado ...]'
}

export async function structureMarkdownWithGemini(rawText: string): Promise<string> {
  // Verificar se a API key está configurada
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não está configurada')
  }

  // Truncar texto usando contagem precisa de tokens
  const truncatedText = truncateToMaxTokens(rawText, MAX_TOKENS)

  const prompt = `Você é um especialista em estruturação de documentos. Converta o seguinte texto extraído de um documento (PDF ou .doc) em um markdown bem estruturado e formatado.

Instruções:
1. Identifique e crie títulos apropriados usando #, ##, ### conforme a hierarquia
2. Organize o conteúdo em parágrafos claros
3. Preserve listas (com marcadores ou numeração) se existirem
4. Mantenha a estrutura lógica do documento original
5. Adicione quebras de linha apropriadas entre seções
6. Preserve formatação importante como negrito, itálico, etc.
7. Não invente conteúdo, apenas estruture o que foi fornecido
8. Se houver tabelas, converta-as para formato markdown de tabela
9. Remova espaços em branco excessivos
10. Garanta que o markdown seja válido e bem formatado

IMPORTANTE: Retorne SOMENTE o conteúdo markdown, sem blocos de código (sem \`\`\`markdown ou \`\`\`), sem explicações, sem texto adicional. Apenas o markdown puro e direto.

Texto a estruturar:

${truncatedText}`

  try {
    // Tentar modelos em ordem de preferência
    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash']
    let lastError: Error | null = null
    
    for (const modelName of modelsToTry) {
      try {
        const { text } = await generateText({
          model: google(modelName),
          prompt,
          maxTokens: 32000,
        })
        
        // Remover blocos de código markdown que o modelo possa ter adicionado
        let cleanedText = text.trim()
        
        // Remove blocos de código markdown (```markdown ... ```)
        cleanedText = cleanedText.replace(/^```markdown\s*\n?/gm, '')
        cleanedText = cleanedText.replace(/^```\s*\n?/gm, '')
        cleanedText = cleanedText.replace(/\n?```\s*$/gm, '')
        
        // Remove qualquer bloco de código que comece e termine com ```
        cleanedText = cleanedText.replace(/^```[\w]*\s*\n?([\s\S]*?)\n?```\s*$/gm, '$1')
        
        return cleanedText.trim()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        // Se não for erro de modelo não encontrado, propagar o erro
        if (!lastError.message.includes('is not found') && !lastError.message.includes('not supported')) {
          throw lastError
        }
        // Caso contrário, tentar próximo modelo
        continue
      }
    }
    
    // Se todos os modelos falharam, lançar o último erro
    throw lastError || new Error('Nenhum modelo Gemini disponível')
  } catch (error) {
    // Log do erro mas não interrompe o fluxo - será tratado pelo caller
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Gemini] Erro ao estruturar markdown:', errorMessage)
    throw new Error(`Falha ao estruturar markdown com Gemini: ${errorMessage}`)
  }
}

