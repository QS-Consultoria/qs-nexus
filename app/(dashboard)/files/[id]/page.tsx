'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileDetailsSkeleton } from '@/components/loading-skeletons'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface FileDetails {
  id: string
  fileName: string
  filePath: string
  fileHash: string
  status: string
  wordsCount: number | null
  processedAt: Date | null
  updatedAt: Date | null
  rejectedReason: string | null
}

interface Template {
  id: string
  title: string
  docType: string
  area: string
  jurisdiction: string
  complexity: string
  tags: string[]
  summary: string
  markdown: string
  qualityScore: string | null
  isGold: boolean
  isSilver: boolean
}

interface Chunk {
  id: string
  section: string | null
  role: string | null
  contentMarkdown: string
  chunkIndex: number
}

export default function FileDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.id as string
  const [file, setFile] = useState<FileDetails | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchFileDetails() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/documents/${fileId}`)

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setFile(data.file)
        setTemplate(data.template)
        setChunks(data.chunks || [])
      } catch (error) {
        console.error('Error fetching file details:', error)
        toast.error('Erro ao carregar detalhes do arquivo')
      } finally {
        setIsLoading(false)
      }
    }

    if (fileId) {
      fetchFileDetails()
    }
  }, [fileId])

  const handleReprocess = async () => {
    // TODO: Implementar reprocessamento
    toast('Funcionalidade de reprocessamento será implementada em breve')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <FileDetailsSkeleton />
      </div>
    )
  }

  if (!file) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Arquivo não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O arquivo solicitado não foi encontrado ou não existe mais.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500',
    pending: 'bg-yellow-500',
    processing: 'bg-orange-500',
    failed: 'bg-red-500',
    rejected: 'bg-gray-500',
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex items-center gap-4">
        <Link href="/files">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{file.fileName}</h1>
          <p className="text-muted-foreground">Detalhes do arquivo</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge className={statusColors[file.status] || 'bg-gray-500'} variant="default">
                {file.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hash</p>
              <p className="text-sm font-mono">{file.fileHash}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Palavras</p>
              <p className="text-sm">{file.wordsCount || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Processado em</p>
              <p className="text-sm">
                {file.processedAt ? new Date(file.processedAt).toLocaleString('pt-BR') : 'N/A'}
              </p>
            </div>
            {file.rejectedReason && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Motivo da Rejeição</p>
                <p className="text-sm text-red-600">{file.rejectedReason}</p>
              </div>
            )}
            {file.status === 'failed' && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reprocessar
                  </Button>
                }
                title="Reprocessar arquivo"
                description="Tem certeza que deseja reprocessar este arquivo? O processamento atual será substituído."
                confirmText="Reprocessar"
                cancelText="Cancelar"
                onConfirm={handleReprocess}
              />
            )}
          </CardContent>
        </Card>

        {template && (
          <Card>
            <CardHeader>
              <CardTitle>Metadados do Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Título</p>
                <p className="text-sm">{template.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <p className="text-sm">{template.docType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Área</p>
                <p className="text-sm">{template.area}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Complexidade</p>
                <p className="text-sm">{template.complexity}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Qualidade</p>
                <div className="flex gap-2">
                  {template.isGold && <Badge className="bg-yellow-500">GOLD</Badge>}
                  {template.isSilver && <Badge className="bg-gray-400">SILVER</Badge>}
                  {template.qualityScore && (
                    <Badge variant="outline">{template.qualityScore}</Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resumo</p>
                <p className="text-sm">{template.summary}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {template && (
        <Card>
          <CardHeader>
            <CardTitle>Preview do Markdown</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
              {template.markdown.substring(0, 2000)}
              {template.markdown.length > 2000 && '...'}
            </pre>
          </CardContent>
        </Card>
      )}

      {chunks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chunks ({chunks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {chunks.map(chunk => (
                <div key={chunk.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      {chunk.section && (
                        <Badge variant="outline" className="mr-2">
                          {chunk.section}
                        </Badge>
                      )}
                      {chunk.role && <Badge variant="outline">{chunk.role}</Badge>}
                    </div>
                    <Badge variant="secondary">#{chunk.chunkIndex}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {chunk.contentMarkdown.substring(0, 200)}
                    {chunk.contentMarkdown.length > 200 && '...'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
