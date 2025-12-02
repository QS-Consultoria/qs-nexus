'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@/lib/contexts/organization-context'
import { FileList } from '@/components/files/file-list'
import { FileListPagination } from '@/components/files/file-list-pagination'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileListSkeleton } from '@/components/loading-skeletons'
import { toast } from 'react-hot-toast'
import { 
  FileText, 
  Search, 
  X, 
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Building2,
} from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface File {
  id: string
  fileName: string
  fileType: string
  status: string
  organizationId?: string
  templateArea?: string | null
  templateDocType?: string | null
  updatedAt: Date | null
  processedAt?: Date | null
}

const AREAS = [
  { value: 'all', label: 'Todas as Áreas' },
  { value: 'civil', label: 'Civil' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'tributario', label: 'Tributário' },
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'penal', label: 'Penal' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'previdenciario', label: 'Previdenciário' },
  { value: 'outro', label: 'Outro' },
]

const DOC_TYPES = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'peticao_inicial', label: 'Petição Inicial' },
  { value: 'contestacao', label: 'Contestação' },
  { value: 'recurso', label: 'Recurso' },
  { value: 'parecer', label: 'Parecer' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'modelo_generico', label: 'Modelo Genérico' },
  { value: 'outro', label: 'Outro' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'completed', label: 'Processado' },
  { value: 'processing', label: 'Processando' },
  { value: 'pending', label: 'Pendente' },
  { value: 'failed', label: 'Erro' },
  { value: 'rejected', label: 'Rejeitado' },
]

export default function DocumentsPage() {
  const { currentOrg } = useOrganization()
  
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalFiles, setTotalFiles] = useState(0)
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  
  // Ordenação
  const [sortBy, setSortBy] = useState<string>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
  })

  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    async function fetchFiles() {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          sortBy,
          sortOrder,
          fileType: 'document', // CRÍTICO: Filtrar apenas documentos (não SPED, nem CSV)
        })

        // Filtro por organização
        if (currentOrg?.id) {
          params.set('organizationId', currentOrg.id)
        }

        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (areaFilter !== 'all') params.set('area', areaFilter)
        if (docTypeFilter !== 'all') params.set('docType', docTypeFilter)
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)

        const response = await fetch(`/api/documents?${params}`)
        if (!response.ok) throw new Error('Erro ao buscar documentos')

        const data = await response.json()
        setFiles(data.files || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalFiles(data.pagination?.total || 0)

        // Calcular estatísticas
        const allFiles = data.files || []
        setStats({
          total: allFiles.length,
          pending: allFiles.filter((f: File) => f.status === 'pending' || f.status === 'processing').length,
          completed: allFiles.filter((f: File) => f.status === 'completed').length,
          failed: allFiles.filter((f: File) => f.status === 'failed' || f.status === 'rejected').length,
        })
      } catch (err) {
        setError('Erro ao carregar documentos')
        console.error(err)
        toast.error('Erro ao carregar documentos')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFiles()
  }, [
    page,
    statusFilter,
    areaFilter,
    docTypeFilter,
    debouncedSearch,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    currentOrg?.id,
  ])

  const handleRefresh = () => {
    setPage(1)
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setAreaFilter('all')
    setDocTypeFilter('all')
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters =
    statusFilter !== 'all' ||
    areaFilter !== 'all' ||
    docTypeFilter !== 'all' ||
    searchQuery !== '' ||
    dateFrom !== '' ||
    dateTo !== ''

  return (
    <div className="space-y-6">
      {/* Header com Badge de Organização */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Documentos Jurídicos</h1>
              <p className="text-muted-foreground">
                Contratos, petições, pareceres e outros documentos textuais
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
        <Button onClick={handleRefresh} variant="outline">
          Atualizar
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">documentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">por processar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">completos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">falhas</p>
          </CardContent>
        </Card>
      </div>

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
              placeholder="Buscar por nome do arquivo ou título..."
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
              <label className="text-sm font-medium mb-2 block">Área Jurídica</label>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Documento</label>
              <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtro por Período */}
          <div className="grid gap-4 md:grid-cols-2">
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

      {/* Lista de Arquivos */}
      {isLoading ? (
        <FileListSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">{error}</p>
            <Button onClick={handleRefresh} className="mt-4">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum documento encontrado</p>
            <p className="text-sm text-muted-foreground mt-2">
              {hasActiveFilters
                ? 'Tente ajustar os filtros ou fazer upload de novos documentos'
                : 'Faça upload de documentos para começar'}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline" className="mt-4">
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <FileList files={files} />
          <FileListPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
