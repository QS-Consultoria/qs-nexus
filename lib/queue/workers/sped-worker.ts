/**
 * SPED Worker
 * Processa jobs de importação SPED
 */

import { Job } from 'bullmq'
import { createWorker, QUEUE_NAMES } from '../config'
import { parseSpedFile } from '@/lib/services/sped-parser'
import { db } from '@/lib/db'
import { spedFiles, chartOfAccounts, accountBalances, journalEntries, journalItems } from '@/lib/db/schema/sped'
import { eq } from 'drizzle-orm'

/**
 * Job data para SPED
 */
export interface SpedJobData {
  spedFileId: string
  filePath: string
  organizationId: string
  userId: string
}

/**
 * Processador de jobs de SPED
 */
async function processSpedJob(job: Job<SpedJobData>) {
  const { spedFileId, filePath, organizationId, userId } = job.data

  console.log(`[SpedWorker] Processando SPED: ${spedFileId}`)

  try {
    // Parse do arquivo
    const parseResult = await parseSpedFile(filePath)

    // Atualizar registro do arquivo
    await db
      .update(spedFiles)
      .set({
        status: 'completed',
        totalRecords: parseResult.stats.totalLines,
        processedRecords: parseResult.stats.processedRecords,
      })
      .where(eq(spedFiles.id, spedFileId))

    // Inserir dados parseados
    // Accounts
    if (parseResult.accounts.length > 0) {
      await db.insert(chartOfAccounts).values(
        parseResult.accounts.map(acc => ({
          ...acc,
          spedFileId,
          organizationId,
        }))
      )
    }

    // Balances
    if (parseResult.balances.length > 0) {
      await db.insert(accountBalances).values(
        parseResult.balances.map(bal => ({
          ...bal,
          spedFileId,
          organizationId,
        }))
      )
    }

    // Entries
    if (parseResult.entries.length > 0) {
      const insertedEntries = await db.insert(journalEntries).values(
        parseResult.entries.map(entry => ({
          ...entry,
          spedFileId,
          organizationId,
        }))
      ).returning()

      // Items (associar com entries inseridas)
      const itemsToInsert: any[] = []
      for (const entry of insertedEntries) {
        const items = parseResult.items.get(entry.entryNumber)
        if (items) {
          itemsToInsert.push(
            ...items.map(item => ({
              ...item,
              journalEntryId: entry.id,
            }))
          )
        }
      }

      if (itemsToInsert.length > 0) {
        await db.insert(journalItems).values(itemsToInsert)
      }
    }

    console.log(`[SpedWorker] SPED processado: ${spedFileId}`, {
      accounts: parseResult.stats.accounts,
      balances: parseResult.stats.balances,
      entries: parseResult.stats.entries,
      items: parseResult.stats.items,
    })

    return {
      success: true,
      stats: parseResult.stats,
    }
  } catch (error) {
    console.error(`[SpedWorker] Erro no SPED ${spedFileId}:`, error)

    // Atualizar status para failed
    await db
      .update(spedFiles)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      })
      .where(eq(spedFiles.id, spedFileId))

    throw error
  }
}

/**
 * Cria e inicia o worker de SPED
 */
export function startSpedWorker() {
  const worker = createWorker(QUEUE_NAMES.SPED, processSpedJob, {
    concurrency: parseInt(process.env.SPED_WORKER_CONCURRENCY || '2'),
  })

  worker.on('completed', (job) => {
    console.log(`[SpedWorker] Job ${job.id} concluído`)
  })

  worker.on('failed', (job, error) => {
    console.error(`[SpedWorker] Job ${job?.id} falhou:`, error)
  })

  console.log(`[SpedWorker] Worker iniciado`)

  return worker
}

