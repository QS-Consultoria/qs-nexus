'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Upload as UploadIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useOrganization } from '@/lib/contexts/organization-context'
import { DocumentUploadDialog } from '@/components/documents/document-upload-dialog'
import { DocumentTable } from '@/components/documents/document-table'
import { DocumentFilters, FilterState } from '@/components/documents/document-filters'
import { DocumentStatsCards } from '@/components/documents/document-stats-cards'

interface Document {
  id: string
  fileName: string
  originalFileName: string
  fileSize: number
  status: string
  documentType: string
  createdAt: string
  uploadedBy?: { name: string }
}

const DOCUMENT_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word (DOCX)' },
  { value: 'doc', label: 'Word (DOC)' },
  { value: 'txt', label: 'Texto (TXT)' },
]

export default function DocumentosPage() {
  const { currentOrg } = useOrganization()
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, failed: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    documentType: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (currentOrg?.id) {
      loadDocuments()
    }
  }, [currentOrg, filters, page])

  const loadDocuments = async () => {
    if (!currentOrg?.id) {
      setDocuments([])
      setStats({ total: 0, pending: 0, completed: 0, failed: 0 })
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        organizationId: currentOrg.id,
        page: page.toString(),
        limit: '20',
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })

      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.documentType !== 'all') params.set('documentType', filters.documentType)
      if (filters.search) params.set('search', filters.search)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const response = await fetch(`/api/documents/list?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar documentos')
      }

      const data = await response.json()
      setDocuments(data.documents || [])
      setStats(data.stats || { total: 0, pending: 0, completed: 0, failed: 0 })
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error loading documents:', error)
      toast.error('Erro ao carregar documentos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (doc: Document) => {
    toast.success(`Download de ${doc.fileName} iniciado`)
    // TODO: Implementar download real
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Deletar ${doc.fileName}?`)) return

    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Documento deletado!')
        loadDocuments()
      } else {
        toast.error('Erro ao deletar documento')
      }
    } catch (error) {
      toast.error('Erro ao deletar documento')
    }
  }

  const handleReprocess = async (doc: Document) => {
    toast.info('Reprocessamento iniciado...')
    // TODO: Implementar reprocessamento
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Documentos
          </h1>
          <p className="text-muted-foreground">
            Documentos gerais (PDF, Word, Texto) da organização
          </p>
        </div>
        <Button
          onClick={() => setIsUploadDialogOpen(true)}
          disabled={!currentOrg}
          size="lg"
        >
          <UploadIcon className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Alerta se não tiver organização selecionada */}
      {!currentOrg && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Selecione uma organização no menu lateral para visualizar e gerenciar documentos
            </p>
          </CardContent>
        </Card>
      )}

      {currentOrg && (
        <>
          {/* Stats */}
          <DocumentStatsCards stats={stats} isLoading={isLoading} />

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription>Refine sua busca</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentFilters
                filters={filters}
                onFilterChange={setFilters}
                documentTypes={DOCUMENT_TYPES}
                showTypeFilter={true}
              />
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Documentos</CardTitle>
                  <CardDescription>
                    {stats.total} documento(s) na organização {currentOrg.name}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DocumentTable
                documents={documents}
                isLoading={isLoading}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onReprocess={handleReprocess}
              />

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onSuccess={loadDocuments}
        documentType="general"
        acceptedFileTypes=".pdf,.docx,.doc,.txt"
        maxSizeMB={50}
        title="Upload de Documentos"
        description="Envie PDFs, documentos Word ou arquivos de texto"
      />
    </div>
  )
}

