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
import { AlertCircle } from 'lucide-react'

interface File {
  id: string
  fileName: string
  status: string
  templateArea?: string | null
  templateDocType?: string | null
  updatedAt: Date | null
}

export default function FilesPage() {
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchFiles() {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        })
        if (statusFilter !== 'all') {
          params.append('status', statusFilter)
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
  }, [page, statusFilter])

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Arquivos</h1>
        <p className="text-muted-foreground">
          Lista de todos os arquivos processados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
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
