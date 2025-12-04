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
  Database,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  Filter,
  X,
  Search,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { DocumentUploadDialog } from '@/components/documents/document-upload-dialog'

interface SpedFile {
  id: string
  organizationId?: string
  fileName: string
  cnpj: string
  companyName: string
  periodStart: string
  periodEnd: string
  status: string
  totalRecords: number
  processedRecords: number
  createdAt: string
  fileType: string
}

interface SpedStats {
  totalFiles: number
  totalCompanies: number
  totalAccounts: number
  totalEntries: number
}

const FILE_TYPES = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'ecd', label: 'ECD - Escrituração Contábil Digital' },
  { value: 'ecf', label: 'ECF - Escrituração Contábil Fiscal' },
  { value: 'efd-icms-ipi', label: 'EFD ICMS/IPI' },
  { value: 'efd-contribuicoes', label: 'EFD Contribuições' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'completed', label: 'Completo' },
  { value: 'processing', label: 'Processando' },
  { value: 'failed', label: 'Erro' },
]

export default function SpedPage() {
  const { currentOrg } = useOrganization()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  
  const [files, setFiles] = useState<SpedFile[]>([])
  const [stats, setStats] = useState<SpedStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')
  const [cnpjFilter, setCnpjFilter] = useState<string>('')
  const [yearFrom, setYearFrom] = useState<string>('')
  const [yearTo, setYearTo] = useState<string>('')

  useEffect(() => {
    loadSpedFiles()
  }, [currentOrg?.id, statusFilter, fileTypeFilter, cnpjFilter, yearFrom, yearTo])

  const loadSpedFiles = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      
      // Filtro por organização
      if (currentOrg?.id) {
        params.set('organizationId', currentOrg.id)
      }
      
      // Filtros específicos
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (fileTypeFilter !== 'all') params.set('fileType', fileTypeFilter)
      if (cnpjFilter) params.set('cnpj', cnpjFilter)
      if (yearFrom) params.set('yearFrom', yearFrom)
      if (yearTo) params.set('yearTo', yearTo)
      
      const response = await fetch(`/api/sped/files?${params}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar arquivos SPED')
      }
      const data = await response.json()
      setFiles(data.files || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Erro ao carregar SPED:', error)
      toast.error('Erro ao carregar arquivos SPED')
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setFileTypeFilter('all')
    setCnpjFilter('')
    setYearFrom('')
    setYearTo('')
  }

  const hasActiveFilters =
    statusFilter !== 'all' ||
    fileTypeFilter !== 'all' ||
    cnpjFilter !== '' ||
    yearFrom !== '' ||
    yearTo !== ''

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj || cnpj.length !== 14) return cnpj
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      completed: { variant: 'default', label: 'Completo' },
      processing: { variant: 'secondary', label: 'Processando' },
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
          <p className="text-muted-foreground">Carregando arquivos SPED...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">SPED (Obrigações Acessórias)</h1>
              <p className="text-muted-foreground">
                Gerencie arquivos ECD, ECF e EFD importados
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
          Upload SPED
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arquivos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">importados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAccounts.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">plano de contas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lançamentos</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEntries.toLocaleString('pt-BR')}</div>
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
              <label className="text-sm font-medium mb-2 block">Tipo SPED</label>
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">CNPJ</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por CNPJ..."
                  value={cnpjFilter}
                  onChange={(e) => setCnpjFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Filtro por Ano Fiscal */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Ano Inicial</label>
              <Input
                type="number"
                placeholder="Ex: 2023"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                min="2000"
                max="2099"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ano Final</label>
              <Input
                type="number"
                placeholder="Ex: 2024"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                min="2000"
                max="2099"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Arquivos Importados</CardTitle>
          <CardDescription>
            Lista de todos os arquivos SPED processados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum arquivo SPED encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Tente ajustar os filtros ou importar novos arquivos'
                  : 'Comece importando seu primeiro arquivo SPED'}
              </p>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} variant="outline">
                  Limpar Filtros
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/upload?tab=sped">
                    <Database className="h-4 w-4 mr-2" />
                    Importar SPED
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
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate max-w-[200px]" title={file.fileName}>
                              {file.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={file.companyName}>
                              {file.companyName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCNPJ(file.cnpj)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(file.periodStart)} - {formatDate(file.periodEnd)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{file.fileType.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(file.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {file.processedRecords} / {file.totalRecords}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Visualizar detalhes"
                          >
                            <Link href={`/sped/${file.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Visualizar</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              toast.success('Download em desenvolvimento')
                            }}
                            title="Baixar relatório"
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
        documentType="sped"
        acceptedFileTypes=".txt,.csv,.xlsx,.xls,.ods"
        maxSizeMB={200}
        title="Upload de Arquivos SPED"
        description="Envie arquivos SPED (ECD, ECF, EFD) em formato TXT, CSV, Excel ou ODS para processamento"
      />
    </div>
  )
}
