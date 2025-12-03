/**
 * Utilitários para upload e validação de arquivos
 */

/**
 * Valida se o tipo de arquivo é aceito
 */
export function validateFileType(file: File, acceptedTypes: string[]): boolean {
  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
  const mimeType = file.type.toLowerCase()
  
  return acceptedTypes.some(type => {
    if (type.startsWith('.')) {
      return fileExtension === type.toLowerCase()
    }
    return mimeType === type.toLowerCase() || mimeType.startsWith(type.toLowerCase())
  })
}

/**
 * Valida se o tamanho do arquivo está dentro do limite
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

/**
 * Obtém a extensão do arquivo
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

/**
 * Formata o tamanho do arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Calcula hash do arquivo (simples - para produção usar crypto)
 */
export async function calculateFileHash(file: File): Promise<string> {
  // Usar ArrayBuffer + crypto.subtle.digest para hash real
  // Por enquanto, usamos timestamp + nome + tamanho
  const timestamp = Date.now()
  const simple = `${file.name}-${file.size}-${timestamp}`
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < simple.length; i++) {
    const char = simple.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Obtém o tipo MIME baseado na extensão
 */
export function getMimeType(fileName: string): string {
  const ext = getFileExtension(fileName)
  
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * Obtém o tipo de documento baseado na extensão
 */
export function getDocumentType(fileName: string): 'pdf' | 'docx' | 'doc' | 'txt' | 'other' {
  const ext = getFileExtension(fileName)
  
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'docx':
      return 'docx'
    case 'doc':
      return 'doc'
    case 'txt':
      return 'txt'
    default:
      return 'other'
  }
}

