'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, FileSpreadsheet, Database, Download, Edit2, Trash2, RefreshCw, MoreHorizontal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatFileSize } from '@/lib/utils/file-upload'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { DocumentStatusBadge } from './document-status-badge'
import { DOCUMENT_TYPES } from '@/lib/constants/processing-tooltips'

interface DocumentItem {
  id: string
  fileName: string
  fileSize: number
  status: string
  documentType?: string
  uploadedBy?: { name: string }
  createdAt: string
  processedAt?: string
  originalFileName?: string
  title?: string
  description?: string
  tags?: string[]
  errorMessage?: string
  currentStep?: number
  totalSteps?: number
}

interface DocumentTableProps {
  documents: DocumentItem[]
  isLoading: boolean
  onEdit?: (doc: DocumentItem) => void
  onDelete?: (doc: DocumentItem) => void
  onDownload?: (doc: DocumentItem) => void
  onReprocess?: (doc: DocumentItem) => void
  showActions?: boolean
}

const getFileIcon = (fileName: string, type?: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const docType = Object.values(DOCUMENT_TYPES).find(dt => 
    dt.extensions.some(e => e.includes(ext || ''))
  )

  if (docType?.icon) {
    return docType.icon
  }

  switch (type) {
    case 'csv':
    case 'xlsx':
      return '📊'
    case 'sped':
      return '💰'
    default:
      return '📄'
  }
}

export function DocumentTable({
  documents,
  isLoading,
  onEdit,
  onDelete,
  onDownload,
  onReprocess,
  showActions = true,
}: DocumentTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Upload por</TableHead>
              <TableHead>Data</TableHead>
              {showActions && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map(i => (
              <TableRow key={i}>
                <TableCell colSpan={showActions ? 6 : 5}>
                  <div className="h-12 bg-muted rounded animate-pulse" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-1">Nenhum documento encontrado</h3>
        <p className="text-sm text-muted-foreground">
          Faça upload de arquivos para começar
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Arquivo</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Upload por</TableHead>
            <TableHead>Data</TableHead>
            {showActions && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const fileIcon = getFileIcon(doc.fileName, doc.documentType)
            const processingTime = doc.processedAt && doc.createdAt
              ? Math.round((new Date(doc.processedAt).getTime() - new Date(doc.createdAt).getTime()) / 1000)
              : undefined
            
            return (
              <TableRow key={doc.id}>
                {/* Arquivo */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{fileIcon}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.fileName}</p>
                      {doc.title && (
                        <p className="text-xs text-muted-foreground truncate">{doc.title}</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Tamanho */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(doc.fileSize)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <DocumentStatusBadge
                    status={doc.status}
                    currentStep={doc.currentStep}
                    totalSteps={doc.totalSteps}
                    error={doc.errorMessage}
                    processingTime={processingTime}
                    showTooltip={true}
                    showIcon={true}
                  />
                </TableCell>

                {/* Upload por */}
                <TableCell className="text-sm text-muted-foreground">
                  {doc.uploadedBy?.name || 'Desconhecido'}
                </TableCell>

                {/* Data */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </TableCell>

                {/* Ações */}
                {showActions && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onDownload && (
                          <DropdownMenuItem onClick={() => onDownload(doc)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(doc)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar Metadados
                          </DropdownMenuItem>
                        )}
                        {onReprocess && doc.status === 'failed' && (
                          <DropdownMenuItem onClick={() => onReprocess(doc)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reprocessar
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(doc)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

