import { NextResponse } from 'next/server'
import { copyFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { processFiles } from '@/lib/services/rag-processor'
import { processingEvents } from '@/lib/services/processing-events'
import { debugLog } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const { files } = await request.json()

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo para processar' }, { status: 400 })
    }

    const jobId = uuidv4()
    const processDir = join(process.cwd(), 'data', 'process')

    // Criar diretório se não existir
    if (!existsSync(processDir)) {
      await mkdir(processDir, { recursive: true })
    }

    // Copiar arquivos para diretório de processamento
    const processedFiles: string[] = []
    for (const file of files) {
      const sourcePath = file.path
      const fileName = file.name
      const destPath = join(processDir, fileName)

      await copyFile(sourcePath, destPath)
      processedFiles.push(destPath)
    }

    // Iniciar processamento assíncrono
    processFiles(processedFiles, (fileName, progress) => {
      // Emite evento de progresso
      debugLog(`[Process API] Emitting progress event for ${fileName}:`, progress)
      processingEvents.emit(jobId, {
        jobId,
        type: 'progress',
        data: {
          fileName: progress.fileName,
          status: progress.status,
          currentStep: progress.currentStep,
          totalSteps: progress.totalSteps,
          progress: progress.progress,
          message: progress.message,
          error: progress.error,
        },
      })
    })
      .then(results => {
        // Emite evento de conclusão
        debugLog(`[Process API] Processing completed for job ${jobId}:`, results)
        const allSuccess = results.every(r => r.success)
        const failed = results.filter(r => !r.success)

        const completionTimestamp = new Date().toISOString()
        if (allSuccess) {
          debugLog(`[Process API] [${completionTimestamp}] All files succeeded, emitting job-complete for job ${jobId}`)
          processingEvents.emit(jobId, {
            jobId,
            type: 'job-complete',
            data: {
              message: `Processamento concluído: ${results.length} arquivo(s) processado(s) com sucesso`,
            },
          })
        } else {
          debugLog(`[Process API] [${completionTimestamp}] Some files failed, emitting job-error for job ${jobId}`)
          processingEvents.emit(jobId, {
            jobId,
            type: 'job-error',
            data: {
              message: `Processamento concluído com erros: ${failed.length} arquivo(s) falharam`,
              error: failed.map(f => `${f.filePath.split('/').pop()}: ${f.error}`).join('; '),
            },
          })
        }

        // Limpa listeners imediatamente, mas mantém histórico por mais tempo para reconexões
        setTimeout(
          () => {
            processingEvents.removeAllListeners(jobId)
            debugLog(`[Process API] Cleaned up listeners for job ${jobId}`)
          },
          1000 // 1 segundo após conclusão
        )
        
        // Limpa histórico após mais tempo para permitir reconexões tardias
        setTimeout(
          () => {
            processingEvents.clearHistory(jobId)
            debugLog(`[Process API] Cleaned up history for job ${jobId}`)
          },
          30 * 1000 // 30 segundos após conclusão
        )
      })
      .catch(error => {
        // Emite evento de erro
        processingEvents.emit(jobId, {
          jobId,
          type: 'job-error',
          data: {
            message: 'Erro ao processar arquivos',
            error: error instanceof Error ? error.message : String(error),
          },
        })
      })

    return NextResponse.json({
      jobId,
      message: `${processedFiles.length} arquivo(s) iniciado(s) para processamento`,
      files: processedFiles.map(path => ({
        name: path.split('/').pop(),
        path,
      })),
    })
  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json({ error: 'Erro ao iniciar processamento' }, { status: 500 })
  }
}
