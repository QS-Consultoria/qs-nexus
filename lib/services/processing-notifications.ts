/**
 * Sistema de Notificações Contextuais para Processamento de Documentos
 * 
 * Fornece notificações inteligentes baseadas no status e contexto do processamento.
 */

import { toast } from 'react-hot-toast'
import { STATUS_EXPLANATIONS, ERROR_SOLUTIONS } from '@/lib/constants/processing-tooltips'

interface NotificationOptions {
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export class ProcessingNotifications {
  /**
   * Notificação quando upload inicia
   */
  static uploadStarted(fileName: string, fileCount: number = 1) {
    if (fileCount === 1) {
      toast.loading(`Enviando ${fileName}...`, {
        id: 'upload-progress',
        duration: 3000,
      })
    } else {
      toast.loading(`Enviando ${fileCount} arquivo(s)...`, {
        id: 'upload-progress',
        duration: 3000,
      })
    }
  }

  /**
   * Notificação quando upload completa
   */
  static uploadCompleted(fileName: string, fileCount: number = 1) {
    toast.dismiss('upload-progress')
    
    if (fileCount === 1) {
      toast.success(
        `📄 ${fileName} enviado!\n\n🔄 Processamento iniciado em segundo plano.`,
        {
          duration: 4000,
          icon: '✅',
        }
      )
    } else {
      toast.success(
        `✅ ${fileCount} arquivo(s) enviado(s)!\n\n🔄 Processamento iniciado.`,
        {
          duration: 4000,
        }
      )
    }
  }

  /**
   * Notificação quando upload falha
   */
  static uploadFailed(fileName: string, error: string) {
    toast.dismiss('upload-progress')
    
    toast.error(
      `❌ Falha ao enviar ${fileName}\n\n${error}`,
      {
        duration: 6000,
      }
    )
  }

  /**
   * Notificação de progresso do processamento
   */
  static processingProgress(fileName: string, step: number, totalSteps: number, message: string) {
    // Apenas para logs, não mostra toast para não poluir
    console.log(`[${fileName}] Etapa ${step}/${totalSteps}: ${message}`)
  }

  /**
   * Notificação quando processamento completa
   */
  static processingCompleted(fileName: string, details?: {
    chunks?: number
    processingTime?: number
  }) {
    const detailsText = details 
      ? `\n\n📦 ${details.chunks || 0} chunks gerados${details.processingTime ? ` em ${details.processingTime}s` : ''}`
      : ''

    toast.success(
      `🎉 ${fileName} processado com sucesso!${detailsText}\n\n✨ Pronto para busca semântica.`,
      {
        duration: 5000,
        icon: '✅',
      }
    )
  }

  /**
   * Notificação quando processamento falha
   */
  static processingFailed(fileName: string, error: string, step?: string) {
    // Busca solução para o erro
    let solution: string | null = null
    for (const [key, errorSolution] of Object.entries(ERROR_SOLUTIONS)) {
      if (error.includes(key)) {
        solution = errorSolution.solution
        break
      }
    }

    const stepText = step ? `\n\n❌ Falhou em: ${step}` : ''
    const solutionText = solution ? `\n\n💡 Solução: ${solution}` : ''

    toast.error(
      `${fileName}${stepText}\n\nErro: ${error}${solutionText}`,
      {
        duration: 10000,
      }
    )
  }

  /**
   * Notificação quando documento é rejeitado
   */
  static documentRejected(fileName: string, reason: string) {
    const statusInfo = STATUS_EXPLANATIONS.rejected

    toast(
      `${statusInfo.icon} ${fileName} foi rejeitado\n\n${reason}\n\n💡 ${statusInfo.action}`,
      {
        duration: 8000,
        icon: '🚫',
      }
    )
  }

  /**
   * Notificação de lote de documentos processados
   */
  static batchCompleted(completed: number, failed: number, rejected: number) {
    if (failed === 0 && rejected === 0) {
      toast.success(
        `✅ Processamento em lote concluído!\n\n${completed} documento(s) processado(s) com sucesso.`,
        {
          duration: 5000,
        }
      )
    } else {
      toast(
        `Processamento em lote concluído:\n\n✅ ${completed} sucesso\n❌ ${failed} erro(s)\n🚫 ${rejected} rejeitado(s)`,
        {
          duration: 8000,
          icon: '📊',
        }
      )
    }
  }

  /**
   * Notificação de reprocessamento iniciado
   */
  static reprocessStarted(fileName: string) {
    toast.loading(
      `🔄 Reprocessando ${fileName}...\n\nO documento será processado novamente do início.`,
      {
        id: `reprocess-${fileName}`,
        duration: 3000,
      }
    )
  }

  /**
   * Notificação customizada com base no status
   */
  static statusChange(status: string, fileName: string, details?: string) {
    const statusInfo = STATUS_EXPLANATIONS[status as keyof typeof STATUS_EXPLANATIONS]
    
    if (!statusInfo) return

    const message = `${statusInfo.icon} ${fileName}\n\n${statusInfo.description}${details ? `\n\n${details}` : ''}`

    switch (status) {
      case 'completed':
        toast.success(message, { duration: 4000 })
        break
      case 'failed':
        toast.error(message, { duration: 6000 })
        break
      case 'processing':
        toast(message, { duration: 3000, icon: '🔄' })
        break
      default:
        toast(message, { duration: 3000 })
    }
  }

  /**
   * Notificação de aviso genérica
   */
  static warning(message: string, options?: NotificationOptions) {
    toast(message, {
      duration: options?.duration || 5000,
      icon: '⚠️',
    })
  }

  /**
   * Notificação de informação
   */
  static info(message: string, options?: NotificationOptions) {
    toast(message, {
      duration: options?.duration || 4000,
      icon: 'ℹ️',
    })
  }

  /**
   * Notificação de dica/sugestão
   */
  static tip(message: string, options?: NotificationOptions) {
    toast(message, {
      duration: options?.duration || 6000,
      icon: '💡',
    })
  }
}

/**
 * Helper para formatar tempo de processamento
 */
export function formatProcessingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}min ${remainingSeconds}s`
}

/**
 * Helper para formatar contagem de chunks
 */
export function formatChunkCount(count: number): string {
  if (count === 1) return '1 chunk'
  return `${count} chunks`
}

