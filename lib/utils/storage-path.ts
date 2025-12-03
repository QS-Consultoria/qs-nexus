/**
 * Utilitários para organização de arquivos no storage
 */

/**
 * Gera caminho de upload organizado por organização e data
 * Formato: /uploads/{organizationId}/{year}/{month}/{hash}-{filename}
 */
export function getUploadPath(organizationId: string, fileName: string, hash: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  
  // Sanitizar nome do arquivo
  const sanitizedFileName = sanitizeFileName(fileName)
  
  return `/uploads/${organizationId}/${year}/${month}/${hash}-${sanitizedFileName}`
}

/**
 * Sanitiza nome de arquivo removendo caracteres especiais
 */
export function sanitizeFileName(fileName: string): string {
  // Remove caracteres especiais, mantém apenas letras, números, pontos, hífens e underscores
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais por underscore
    .replace(/_{2,}/g, '_') // Remove underscores duplicados
    .toLowerCase()
}

/**
 * Extrai o organizationId de um caminho de arquivo
 */
export function extractOrganizationIdFromPath(filePath: string): string | null {
  const match = filePath.match(/\/uploads\/([^/]+)\//)
  return match ? match[1] : null
}

/**
 * Verifica se um caminho pertence a uma organização
 */
export function pathBelongsToOrganization(filePath: string, organizationId: string): boolean {
  const extractedId = extractOrganizationIdFromPath(filePath)
  return extractedId === organizationId
}

