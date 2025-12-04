import { Worker, Job } from 'bullmq'
import { db } from '@/lib/db'
import { spedFiles, chartOfAccounts, journalEntries } from '@/lib/db/schema/sped'
import { eq } from 'drizzle-orm'
import { redis } from '@/lib/queue/redis'
import { parseSpedFile } from '@/lib/parsers/sped-parser'
import type { SpedJobData } from '@/lib/queue/sped-queue'

/**
 * Worker BullMQ para processar arquivos SPED
 * 
 * Execução:
 * - Desenvolvimento: npm run worker
 * - Produção (Heroku): worker dyno executa automaticamente
 */

let worker: Worker | null = null

export function startSpedWorker() {
  if (!redis) {
    console.error('❌ Redis not configured - worker cannot start')
    return null
  }

  if (worker) {
    console.log('⚠️  Worker already running')
    return worker
  }

  worker = new Worker<SpedJobData>(
    'sped-processing',
    async (job: Job<SpedJobData>) => {
      console.log(`\n🔄 Processing SPED job ${job.id}...`)
      await processSpedJob(job)
    },
    {
      connection: redis,
      concurrency: 2, // Processar 2 arquivos simultaneamente
      limiter: {
        max: 10, // Máximo 10 jobs
        duration: 60000, // Por minuto
      },
    }
  )

  // Event listeners
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('❌ Worker error:', err)
  })

  console.log('🚀 SPED Worker started and listening for jobs...')
  return worker
}

/**
 * Processar job SPED
 */
async function processSpedJob(job: Job<SpedJobData>) {
  const { spedFileId, filePath, fileName, organizationId } = job.data

  try {
    // 1. Atualizar status para "processing"
    await job.updateProgress(10)
    await db
      .update(spedFiles)
      .set({ status: 'processing' })
      .where(eq(spedFiles.id, spedFileId))

    console.log(`📄 Parsing ${fileName}...`)

    // 2. Parsear arquivo SPED
    await job.updateProgress(30)
    const parsed = await parseSpedFile(filePath)

    if (!parsed.header) {
      throw new Error('Arquivo SPED inválido: cabeçalho não encontrado')
    }

    console.log(`📊 Parsed: ${parsed.accounts.length} accounts, ${parsed.entries.length} entries`)

    // 3. Atualizar dados do arquivo com informações do registro 0000
    await job.updateProgress(50)
    await db
      .update(spedFiles)
      .set({
        cnpj: parsed.header.cnpj,
        companyName: parsed.header.razaoSocial,
        periodStart: parsed.header.dataInicio,
        periodEnd: parsed.header.dataFim,
        fileType: parsed.header.tipo,
        stateCode: parsed.header.uf,
        totalRecords: parsed.totalLines,
      })
      .where(eq(spedFiles.id, spedFileId))

    // 4. Inserir plano de contas (C050)
    await job.updateProgress(60)
    if (parsed.accounts.length > 0) {
      console.log(`💾 Saving ${parsed.accounts.length} accounts...`)
      
      // Inserir em lotes de 100
      const batchSize = 100
      for (let i = 0; i < parsed.accounts.length; i += batchSize) {
        const batch = parsed.accounts.slice(i, i + batchSize)
        
        await db.insert(chartOfAccounts).values(
          batch.map(acc => ({
            organizationId,
            spedFileId,
            accountCode: acc.codigo,
            accountName: acc.nome,
            accountType: acc.tipo,
            accountLevel: acc.nivel,
            parentAccountCode: acc.codigoPai || null,
            accountNature: acc.natureza as any || null,
          }))
        )
      }
      
      console.log(`✅ Saved ${parsed.accounts.length} accounts`)
    }

    // 5. Inserir lançamentos (I200)
    await job.updateProgress(80)
    if (parsed.entries.length > 0) {
      console.log(`💾 Saving ${parsed.entries.length} entries...`)
      
      const batchSize = 100
      for (let i = 0; i < parsed.entries.length; i += batchSize) {
        const batch = parsed.entries.slice(i, i + batchSize)
        
        await db.insert(journalEntries).values(
          batch.map(entry => ({
            organizationId,
            spedFileId,
            entryNumber: entry.numero,
            entryDate: entry.data,
            entryAmount: entry.valor,
            entryType: entry.tipo || null,
            description: entry.descricao || null,
          }))
        )
      }
      
      console.log(`✅ Saved ${parsed.entries.length} entries`)
    }

    // 6. Marcar como completo
    await job.updateProgress(100)
    await db
      .update(spedFiles)
      .set({
        status: 'completed',
        processedRecords: parsed.totalLines,
      })
      .where(eq(spedFiles.id, spedFileId))

    console.log(`✅ SPED ${fileName} processed successfully!`)
    
    // Retornar estatísticas
    return {
      accounts: parsed.accounts.length,
      entries: parsed.entries.length,
      totalLines: parsed.totalLines,
      errors: parsed.errors,
    }

  } catch (error: any) {
    console.error(`❌ Error processing SPED ${fileName}:`, error)

    // Marcar como falho
    await db
      .update(spedFiles)
      .set({
        status: 'failed',
        errorMessage: error.message,
      })
      .where(eq(spedFiles.id, spedFileId))

    throw error // Re-throw para BullMQ registrar falha
  }
}

/**
 * Parar worker gracefully
 */
export async function stopSpedWorker() {
  if (worker) {
    await worker.close()
    worker = null
    console.log('🛑 SPED Worker stopped')
  }
}

// Auto-start worker em modo produção
if (process.env.NODE_ENV === 'production' && process.env.DYNO?.includes('worker')) {
  console.log('🔧 Auto-starting worker (Heroku worker dyno)')
  startSpedWorker()
}

