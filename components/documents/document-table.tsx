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

interface Document {
  id: string
  fileName: string
  fileSize: number
  status: string
  documentType?: string
  uploadedBy?: { name: string }
  createdAt: string
  processedAt?: string
}

interface DocumentTableProps {
  documents: Document[]
  isLoading: boolean
  onEdit?: (doc: Document) => void
  onDelete?: (doc: Document) => void
  onDownload?: (doc: Document) => void
  onReprocess?: (doc: Document) => void
  showActions?: boolean
}

const getFileIcon = (type?: string) => {
  switch (type) {
    case 'csv':
    case 'xlsx':
      return FileSpreadsheet
    case 'sped':
      return Database
    default:
      return FileText
  }
}

const getStatusBadge = (status: string) => {
  const config = {
    pending: { label: 'Pendente', variant: 'secondary' as const },
    processing: { label: 'Processando', variant: 'default' as const },
    completed: { label: 'Concluído', variant: 'default' as const },
    failed: { label: 'Erro', variant: 'destructive' as const },
  }
  
  return config[status as keyof typeof config] || config.pending
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
            const Icon = getFileIcon(doc.documentType)
            const statusBadge = getStatusBadge(doc.status)
            
            return (
              <TableRow key={doc.id}>
                {/* Arquivo */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.fileName}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Tamanho */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(doc.fileSize)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={statusBadge.variant}>
                    {statusBadge.label}
                  </Badge>
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

