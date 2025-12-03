'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileSpreadsheet,
  Building2,
  Loader2,
  AlertCircle,
  Filter,
  X,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Eye,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { DocumentUploadDialog } from '@/components/documents/document-upload-dialog'

interface CsvFile {
  id: string
  organizationId?: string
  fileName: string
  filePath: string
  fileType: string
  status: string
  wordsCount?: number
  processedAt?: string
  createdAt: string
  updatedAt: string
}

interface CsvStats {
  totalFiles: number
  totalRows: number
  byStatus: {
    completed: number
    processing: number
    pending: number
    failed: number
  }
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'completed', label: 'Validado' },
  { value: 'processing', label: 'Processando' },
  { value: 'pending', label: 'Pendente' },
  { value: 'failed', label: 'Erro' },
]

export default function CsvPage() {
  const { currentOrg } = useOrganization()
  
  const [files, setFiles] = useState<CsvFile[]>([])
  const [stats, setStats] = useState<CsvStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  useEffect(() => {
    loadCsvFiles()
  }, [currentOrg?.id, statusFilter, searchQuery, dateFrom, dateTo])

  const loadCsvFiles = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      
      // Filtro por organização
      if (currentOrg?.id) {
        params.set('organizationId', currentOrg.id)
      }
      
      // Filtros específicos
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      
      const response = await fetch(`/api/csv/files?${params}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar arquivos CSV')
      }
      const data = await response.json()
      setFiles(data.files || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Erro ao carregar CSV:', error)
      toast.error('Erro ao carregar arquivos CSV')
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters =
    statusFilter !== 'all' ||
    searchQuery !== '' ||
    dateFrom !== '' ||
    dateTo !== ''

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      completed: { variant: 'default', label: 'Validado' },
      processing: { variant: 'secondary', label: 'Processando' },
      pending: { variant: 'outline', label: 'Pendente' },
      failed: { variant: 'destructive', label: 'Erro' },
    }
    const config = variants[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando planilhas CSV...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Planilhas (CSV)</h1>
              <p className="text-muted-foreground">
                Gerencie planilhas de controle, clientes e dados financeiros
              </p>
            </div>
          </div>
          {currentOrg && (
            <Badge variant="outline" className="mt-3 gap-2">
              <Building2 className="h-3 w-3" />
              {currentOrg.name}
            </Badge>
          )}
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} disabled={!currentOrg}>
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">planilhas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus.completed}</div>
              <p className="text-xs text-muted-foreground">completas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus.pending + stats.byStatus.processing}</div>
              <p className="text-xs text-muted-foreground">aguardando</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Linhas</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRows.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">registros</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filtros</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do arquivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Grid de Filtros */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planilhas Importadas</CardTitle>
          <CardDescription>
            Lista de todas as planilhas CSV processadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma planilha encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Tente ajustar os filtros ou importar novas planilhas'
                  : 'Comece importando sua primeira planilha CSV'}
              </p>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} variant="outline">
                  Limpar Filtros
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/upload?tab=csv">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Importar CSV
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linhas</TableHead>
                    <TableHead>Importado em</TableHead>
                    <TableHead>Processado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[300px]" title={file.fileName}>
                            {file.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(file.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {file.wordsCount ? file.wordsCount.toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(file.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {file.processedAt ? formatDate(file.processedAt) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              toast.success('Visualização em desenvolvimento')
                            }}
                            title="Visualizar dados"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Visualizar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              toast.success('Download em desenvolvimento')
                            }}
                            title="Baixar arquivo"
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onSuccess={() => window.location.reload()}
        documentType="csv"
        acceptedFileTypes=".csv,.xlsx,.xls"
        maxSizeMB={100}
        title="Upload de Planilhas CSV"
        description="Envie arquivos CSV ou Excel para processamento"
      />
    </div>
  )
}
