import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { Worker } from 'node:worker_threads'
import { writeFileSync, existsSync } from 'node:fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const PROJECT_ROOT = process.cwd()
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const WORKER_PATH = join(__dirname, '../lib/workers/document-converter-worker.ts')

/**
 * Converte documento para Markdown usando Worker Thread
 */
function convertDocumentWithWorker(filePath: string): Promise<{ markdown: string; wordCount: number }> {
  return new Promise((resolve, reject) => {
    const taskId = `${Date.now()}-${Math.random()}`

    try {
      const execArgv = process.execArgv.length > 0 ? process.execArgv : ['--import', 'tsx/esm']
      const worker = new Worker(WORKER_PATH, { execArgv })

      const timeout = setTimeout(() => {
        worker.terminate()
        reject(new Error('Worker timeout após 60s'))
      }, 60000)

      worker.on(
        'message',
        (message: { taskId: string; success: boolean; result?: any; error?: string }) => {
          if (message.taskId !== taskId) {
            return
          }

          clearTimeout(timeout)
          worker.terminate()

          if (message.success && message.result) {
            resolve(message.result)
          } else {
            reject(new Error(message.error || 'Unknown error'))
          }
        }
      )

      worker.on('error', error => {
        clearTimeout(timeout)
        worker.terminate()
        reject(error)
      })

      worker.postMessage({ filePath, taskId })
    } catch (error) {
      reject(error)
    }
  })
}

async function main() {
  // Caminho do arquivo PDF específico
  const pdfFileName = '(Software Engineer) Nubank_ Inside the Process.pdf'
  const pdfPath = join(PROJECT_ROOT, 'uploads', 'temp', pdfFileName)

  if (!existsSync(pdfPath)) {
    console.error(`❌ Arquivo não encontrado: ${pdfPath}`)
    process.exit(1)
  }

  console.log(`📄 Convertendo PDF: ${pdfFileName}`)
  console.log(`📂 Caminho: ${pdfPath}\n`)

  try {
    const { markdown, wordCount } = await convertDocumentWithWorker(pdfPath)

    console.log(`✅ Conversão concluída!`)
    console.log(`📊 Palavras contadas: ${wordCount}`)
    console.log(`📝 Tamanho do markdown: ${markdown.length} caracteres\n`)

    // Salva o markdown em um arquivo para investigação
    const outputPath = join(PROJECT_ROOT, 'data', 'markdown', `debug-${Date.now()}.md`)
    writeFileSync(outputPath, markdown, 'utf-8')
    console.log(`💾 Markdown salvo em: ${outputPath}`)

    // Mostra uma prévia do markdown
    console.log('\n📋 Prévia do markdown (primeiros 500 caracteres):')
    console.log('─'.repeat(80))
    console.log(markdown.substring(0, 500))
    console.log('─'.repeat(80))

    // Analisa o markdown
    const lines = markdown.split('\n').filter(line => line.trim().length > 0)
    const nonEmptyLines = markdown.split('\n').length
    const words = markdown.split(/\s+/).filter(word => word.length > 0)

    console.log('\n📊 Estatísticas:')
    console.log(`   - Linhas totais: ${nonEmptyLines}`)
    console.log(`   - Linhas não vazias: ${lines.length}`)
    console.log(`   - Palavras (split simples): ${words.length}`)
    console.log(`   - Palavras (contador do worker): ${wordCount}`)
    console.log(`   - Diferença: ${Math.abs(words.length - wordCount)}`)

  } catch (error) {
    console.error('❌ Erro ao converter PDF:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

main().catch(console.error)

