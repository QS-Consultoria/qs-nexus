'use client'

import { useEffect, useState } from 'react'
import { FileList } from '@/components/files/file-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileListSkeleton } from '@/components/loading-skeletons'
import { toast } from 'react-hot-toast'
import { AlertCircle, Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface File {
  id: string
  fileName: string
  status: string
  templateArea?: string | null
  templateDocType?: string | null
  updatedAt: Date | null
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

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Data de Atualização' },
  { value: 'fileName', label: 'Nome do Arquivo' },
  { value: 'status', label: 'Status' },
]

export default function FilesPage() {
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('updatedAt')
  const [sortOrder, setSortOrder] = useState<string>('desc')

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
        })
        if (statusFilter !== 'all') {
          params.append('status', statusFilter)
        }
        if (areaFilter !== 'all') {
          params.append('area', areaFilter)
        }
        if (docTypeFilter !== 'all') {
          params.append('docType', docTypeFilter)
        }
        if (debouncedSearch) {
          params.append('search', debouncedSearch)
        }

        const response = await fetch(`/api/documents?${params}`)

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setFiles(data.files || [])
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido ao carregar arquivos'
        console.error('Error fetching files:', error)
        setError(errorMessage)
        toast.error('Erro ao carregar arquivos. Tente novamente.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFiles()
  }, [page, statusFilter, areaFilter, docTypeFilter, debouncedSearch, sortBy, sortOrder])

  const clearFilters = () => {
    setStatusFilter('all')
    setAreaFilter('all')
    setDocTypeFilter('all')
    setSearchQuery('')
    setSortBy('updatedAt')
    setSortOrder('desc')
  }

  const hasActiveFilters =
    statusFilter !== 'all' ||
    areaFilter !== 'all' ||
    docTypeFilter !== 'all' ||
    searchQuery !== '' ||
    sortBy !== 'updatedAt' ||
    sortOrder !== 'desc'

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Arquivos</h1>
        <p className="text-muted-foreground">
          Lista de todos os arquivos processados
        </p>
      </div>

      <Card className="border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Busca por título */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro por Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="processing">Em Processamento</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="failed">Falhados</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por Área */}
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map(area => (
                  <SelectItem key={area.value} value={area.value}>
                    {area.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Tipo */}
            <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ordenação */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ordem */}
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Ordem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Crescente</SelectItem>
                <SelectItem value="desc">Decrescente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Arquivos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <FileListSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null)
                  setIsLoading(true)
                  window.location.reload()
                }}
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <FileList files={files} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
