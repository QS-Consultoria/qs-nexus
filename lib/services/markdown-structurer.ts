import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

/**
 * Estrutura texto extraído de PDF ou .doc em markdown bem formatado usando Google Gemini
 * 
 * Esta função usa o modelo Gemini 1.5 Flash para estruturar o texto extraído,
 * adicionando títulos, parágrafos, listas e outras formatações markdown apropriadas.
 * 
 * @param rawText - Texto extraído do documento (pode ser texto simples ou markdown básico)
 * @returns Markdown bem estruturado
 */
export async function structureMarkdownWithGemini(rawText: string): Promise<string> {
  // Verificar se a API key está configurada
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não está configurada')
  }

  // Limitar o tamanho do texto para evitar exceder limites de tokens
  // Gemini 1.5 Flash suporta até 1M tokens de entrada, mas vamos ser conservadores
  // Estimativa: 1 token ≈ 4 caracteres para português
  const MAX_CHARS = 3_500_000 // ~875k tokens (deixando margem de segurança)
  const truncatedText = rawText.length > MAX_CHARS 
    ? rawText.substring(0, MAX_CHARS) + '\n\n[... texto truncado ...]'
    : rawText

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

Texto a estruturar:

${truncatedText}

Retorne APENAS o markdown estruturado, sem explicações adicionais, sem blocos de código, sem formatação adicional. Apenas o markdown puro.`

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
        return text.trim()
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

