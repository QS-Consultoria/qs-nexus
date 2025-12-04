import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { parseSpedFile } from '@/lib/services/sped-parser'
import { db } from '@/lib/db'
import {
  spedFiles,
  chartOfAccounts,
  accountBalances,
  journalEntries,
  journalItems,
} from '@/lib/db/schema/sped'
import { templates } from '@/lib/db/schema/rag'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { spedProcessingEvents } from '@/lib/services/sped-processing-events'
import { generateSpedSummaryMarkdown, classifySpedDocument } from '@/lib/services/sped-classifier'
import { notifySpedUploadComplete, notifySpedUploadFailed } from '@/lib/services/notification-service'
import { processSpedForRag } from '@/lib/services/sped-rag-processor'

export const maxDuration = 300 // 5 minutos para arquivos grandes

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
    }

    // Validar extensão
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.txt', '.csv', '.xlsx', '.xls', '.ods', '.sped']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Formato inválido. Envie um arquivo .txt, .csv, .xlsx, .xls, .ods ou .sped' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: 50MB` },
        { status: 400 }
      )
    }

    const jobId = uuidv4()
    const fileSize = file.size
    
    console.log(`\n=== INGESTÃO SPED ASSÍNCRONA: ${file.name} ===`)
    console.log(`Job ID: ${jobId}`)
    console.log(`Tamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

    // Salvar arquivo temporariamente
    const uploadDir = join(process.cwd(), 'uploads', 'sped')
    await mkdir(uploadDir, { recursive: true })

    const filePath = join(uploadDir, `${Date.now()}-${file.name}`)
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    console.log(`Arquivo salvo em: ${filePath}`)

    // Estimativa de tempo (baseada em tamanho)
    // ~3-5 MB/min dependendo da complexidade
    const estimatedMinutes = Math.ceil(fileSize / (1024 * 1024 * 3.5))
    const estimatedTime = estimatedMinutes > 1 
      ? `${estimatedMinutes} ${estimatedMinutes === 1 ? 'minuto' : 'minutos'}`
      : `${Math.ceil(estimatedMinutes * 60)} segundos`
    
    console.log(`Tempo estimado: ${estimatedTime}`)

    // Inicia processamento assíncrono
    processSpedFileAsync(jobId, filePath, file.name).catch(err => {
      console.error(`[Job ${jobId}] Erro no processamento SPED:`, err)
      spedProcessingEvents.emit(jobId, {
        jobId,
        type: 'job-error',
        data: {
          fileName: file.name,
          status: 'failed',
          progress: 0,
          error: err.message || 'Erro desconhecido',
          message: 'Processamento falhou',
        },
      })
    })
    
    // Retorna imediatamente com jobId
    return NextResponse.json({
      success: true,
      jobId,
      fileName: file.name,
      fileSize,
      estimatedTime,
      message: `Processamento iniciado. Tempo estimado: ${estimatedTime}`,
    })
    
  } catch (error) {
    console.error('Erro ao iniciar ingestão SPED:', error)
    
    return NextResponse.json(
      {
        error: 'Erro ao iniciar processamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

// ================================================================
// Função Assíncrona de Processamento
// ================================================================

async function processSpedFileAsync(jobId: string, filePath: string, fileName: string) {
  try {
    console.log(`[Job ${jobId}] Iniciando processamento assíncrono`)
    
    // Etapa 1: Parse (0-40%)
    spedProcessingEvents.emit(jobId, {
      jobId,
      type: 'progress',
      data: {
        fileName,
        status: 'parsing',
        currentStep: 1,
        totalSteps: 5,
        progress: 10,
        message: 'Analisando arquivo SPED...',
      },
    })
    
    console.log(`[Job ${jobId}] Iniciando parse...`)
    const parseResult = await parseSpedFile(filePath)
    
    console.log(`[Job ${jobId}] Parse concluído:`)
    console.log(`  - Contas: ${parseResult.stats.accounts}`)
    console.log(`  - Saldos: ${parseResult.stats.balances}`)
    console.log(`  - Lançamentos: ${parseResult.stats.entries}`)
    console.log(`  - Partidas: ${parseResult.stats.items}`)
    console.log(`  - Erros: ${parseResult.stats.errors}`)
    
    spedProcessingEvents.emit(jobId, {
      jobId,
      type: 'progress',
      data: {
        fileName,
        status: 'parsing',
        currentStep: 2,
        totalSteps: 5,
        progress: 40,
        message: 'Parse concluído com sucesso',
        stats: parseResult.stats,
      },
    })
    
    // Etapa 2: Salvando arquivo SPED (40-50%)
    spedProcessingEvents.emit(jobId, {
      jobId,
      type: 'progress',
      data: {
        fileName,
        status: 'saving',
        currentStep: 3,
        totalSteps: 5,
        progress: 45,
        message: 'Criando registro do arquivo SPED...',
      },
    })
    
    const [spedFile] = await db
      .insert(spedFiles)
      .values({
        ...parseResult.file,
        status: 'completed',
      })
      .returning()
    
    console.log(`[Job ${jobId}] Arquivo SPED criado: ${spedFile.id}`)
    
    // Etapa 3: Inserir contas (50-60%)
    if (parseResult.accounts.length > 0) {
      console.log(`[Job ${jobId}] Inserindo ${parseResult.accounts.length} contas...`)
      const accountsToInsert = parseResult.accounts.map(acc => ({
        ...acc,
        spedFileId: spedFile.id,
      }))
      
      for (let i = 0; i < accountsToInsert.length; i += 500) {
        const batch = accountsToInsert.slice(i, i + 500)
        await db.insert(chartOfAccounts).values(batch)
        
        const progress = 50 + Math.floor((i / accountsToInsert.length) * 10)
        spedProcessingEvents.emit(jobId, {
          jobId,
          type: 'progress',
          data: {
            fileName,
            status: 'saving',
            currentStep: 3,
            totalSteps: 5,
            progress,
            message: `Salvando contas (${i + batch.length}/${accountsToInsert.length})...`,
          },
        })
      }
      console.log(`[Job ${jobId}] ${parseResult.accounts.length} contas inseridas`)
    }
    
    // Etapa 4: Inserir saldos (60-70%)
    if (parseResult.balances.length > 0) {
      console.log(`[Job ${jobId}] Inserindo ${parseResult.balances.length} saldos...`)
      const balancesToInsert = parseResult.balances.map(bal => ({
        ...bal,
        spedFileId: spedFile.id,
      }))
      
      for (let i = 0; i < balancesToInsert.length; i += 500) {
        const batch = balancesToInsert.slice(i, i + 500)
        await db.insert(accountBalances).values(batch)
        
        const progress = 60 + Math.floor((i / balancesToInsert.length) * 10)
        spedProcessingEvents.emit(jobId, {
          jobId,
          type: 'progress',
          data: {
            fileName,
            status: 'saving',
            currentStep: 4,
            totalSteps: 5,
            progress,
            message: `Salvando saldos (${i + batch.length}/${balancesToInsert.length})...`,
          },
        })
      }
      console.log(`[Job ${jobId}] ${parseResult.balances.length} saldos inseridos`)
    }
    
    // Etapa 5: Inserir lançamentos e partidas (70-95%)
    if (parseResult.entries.length > 0) {
      console.log(`[Job ${jobId}] Inserindo ${parseResult.entries.length} lançamentos...`)
      let processedEntries = 0
      const totalEntries = parseResult.entries.length
      
      for (const entry of parseResult.entries) {
        const [insertedEntry] = await db
          .insert(journalEntries)
          .values({
            ...entry,
            spedFileId: spedFile.id,
          })
          .returning()
        
        // Inserir partidas do lançamento
        const items = parseResult.items.get(entry.entryNumber)
        if (items && items.length > 0) {
          const itemsToInsert = items.map(item => ({
            ...item,
            journalEntryId: insertedEntry.id,
          }))
          await db.insert(journalItems).values(itemsToInsert)
        }
        
        processedEntries++
        
        // Emitir progresso a cada 500 lançamentos ou no final
        if (processedEntries % 500 === 0 || processedEntries === totalEntries) {
          const progress = 70 + Math.floor((processedEntries / totalEntries) * 25)
          spedProcessingEvents.emit(jobId, {
            jobId,
            type: 'progress',
            data: {
              fileName,
              status: 'saving',
              currentStep: 5,
              totalSteps: 5,
              progress,
              message: `Salvando lançamentos (${processedEntries}/${totalEntries})...`,
            },
          })
        }
      }
      console.log(`[Job ${jobId}] ${parseResult.entries.length} lançamentos inseridos`)
    }
    
    // Etapa 6: Classificação AI (95-100%)
    try {
      spedProcessingEvents.emit(jobId, {
        jobId,
        type: 'progress',
        data: {
          fileName,
          status: 'saving',
          currentStep: 5,
          totalSteps: 5,
          progress: 95,
          message: 'Classificando dados contábeis com AI...',
        },
      })
      
      console.log(`[Job ${jobId}] Iniciando classificação AI...`)
      
      // Buscar amostra de contas e saldos para classificação
      const sampleAccounts = await db
        .select()
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.spedFileId, spedFile.id))
        .limit(50)
      
      const sampleBalances = await db
        .select()
        .from(accountBalances)
        .where(eq(accountBalances.spedFileId, spedFile.id))
        .limit(50)
      
      // Gerar markdown para classificação
      const spedMarkdown = generateSpedSummaryMarkdown({
        fileName,
        cnpj: parseResult.file.cnpj,
        companyName: parseResult.file.companyName,
        periodStart: parseResult.file.periodStart,
        periodEnd: parseResult.file.periodEnd,
        fileType: parseResult.file.fileType,
        stats: parseResult.stats,
        sampleAccounts: sampleAccounts.map(acc => ({
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          accountType: acc.accountType || 'S',
        })),
        sampleBalances: sampleBalances.map(bal => ({
          accountCode: bal.accountCode,
          debitBalance: parseFloat(bal.debitTotal) || 0,
          creditBalance: parseFloat(bal.creditTotal) || 0,
        })),
      })
      
      // Classificar com AI
      const classification = await classifySpedDocument(spedMarkdown, parseResult.stats)
      
      console.log(`[Job ${jobId}] Classificação concluída`)
      console.log(`  - Risco: ${classification.riskLevel}`)
      console.log(`  - Qualidade: ${classification.dataQuality}`)
      console.log(`  - Completude: ${classification.completenessScore}%`)
      
      // Salvar classificação como template
      // TODO: Criar registro em document_files e vincular ao template
      // Por ora, salvar apenas no templates
      await db.insert(templates).values({
        documentFileId: spedFile.id, // Temporariamente usar spedFile.id (deve ser documentFileId no futuro)
        title: `SPED ${parseResult.file.fileType} - ${parseResult.file.companyName}`,
        markdown: spedMarkdown,
        metadata: classification as any,
        // schemaConfigId será adicionado quando tivermos o ID do schema SPED ativo
      })
      
      console.log(`[Job ${jobId}] Template de classificação salvo`)
      
    } catch (classificationError) {
      console.error(`[Job ${jobId}] Erro na classificação AI (não-crítico):`, classificationError)
      // Não falha o processamento se a classificação falhar
    }
    
    // Etapa 7: Gerar chunks e embeddings para RAG (95-100%)
    try {
      spedProcessingEvents.emit(jobId, {
        jobId,
        type: 'progress',
        data: {
          fileName,
          status: 'saving',
          currentStep: 5,
          totalSteps: 5,
          progress: 95,
          message: 'Gerando chunks e embeddings para busca RAG...',
        },
      })
      
      console.log(`[Job ${jobId}] Iniciando processamento RAG...`)
      
      const ragResult = await processSpedForRag(spedFile.id, (progress) => {
        // Atualiza progresso RAG (95-100%)
        const overallProgress = 95 + Math.floor(progress.progress * 0.05)
        spedProcessingEvents.emit(jobId, {
          jobId,
          type: 'progress',
          data: {
            fileName,
            status: 'saving',
            currentStep: 5,
            totalSteps: 5,
            progress: overallProgress,
            message: progress.message,
          },
        })
      })
      
      if (ragResult.success) {
        console.log(`[Job ${jobId}] RAG processado com sucesso`)
        console.log(`  - Template ID: ${ragResult.templateId}`)
        console.log(`  - Chunks: ${ragResult.stats?.chunks || 0}`)
        console.log(`  - Embeddings: ${ragResult.stats?.embeddings || 0}`)
      } else {
        console.warn(`[Job ${jobId}] Erro no processamento RAG (não-crítico): ${ragResult.error}`)
      }
      
    } catch (ragError) {
      console.error(`[Job ${jobId}] Erro no processamento RAG (não-crítico):`, ragError)
      // Não falha o processamento se RAG falhar
    }
    
    // Concluído! (100%)
    console.log(`[Job ${jobId}] === PROCESSAMENTO CONCLUÍDO ===\n`)
    spedProcessingEvents.emit(jobId, {
      jobId,
      type: 'job-complete',
      data: {
        fileName,
        status: 'completed',
        currentStep: 5,
        totalSteps: 5,
        progress: 100,
        message: 'Processamento concluído com sucesso!',
        stats: parseResult.stats,
      },
    })

    // Criar notificação de sucesso
    try {
      const userId = 'dev-user-123' // TODO: Pegar da sessão
      await notifySpedUploadComplete(userId, fileName, spedFile.id, parseResult.stats)
      console.log(`[Job ${jobId}] Notificação de sucesso criada`)
    } catch (notifError) {
      console.error(`[Job ${jobId}] Erro ao criar notificação (não-crítico):`, notifError)
    }
    
  } catch (error) {
    console.error(`[Job ${jobId}] Erro no processamento:`, error)
    
    // Mensagens de erro específicas
    let errorMessage = 'Erro ao processar arquivo SPED'
    let errorDetails = error instanceof Error ? error.message : 'Erro desconhecido'

    if (errorDetails.includes('duplicate key') || errorDetails.includes('file_hash')) {
      errorMessage = 'Arquivo já importado anteriormente'
      errorDetails = 'Este arquivo SPED já foi processado. Cada arquivo pode ser importado apenas uma vez.'
    }
    
    spedProcessingEvents.emit(jobId, {
      jobId,
      type: 'job-error',
      data: {
        fileName,
        status: 'failed',
        progress: 0,
        error: errorMessage,
        message: errorDetails,
      },
    })

    // Criar notificação de erro
    try {
      const userId = 'dev-user-123' // TODO: Pegar da sessão
      await notifySpedUploadFailed(userId, fileName, errorDetails)
      console.log(`[Job ${jobId}] Notificação de erro criada`)
    } catch (notifError) {
      console.error(`[Job ${jobId}] Erro ao criar notificação de erro (não-crítico):`, notifError)
    }
    
    throw error
  }
}
