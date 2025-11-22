'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileDetailsSkeleton } from '@/components/loading-skeletons'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ArrowLeft, RefreshCw, Edit, Save, X, Loader2, Upload, FileText, Trash2, Eye, Code } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

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
  markdown: string
  metadata?: {
    docType?: string
    area?: string
    jurisdiction?: string
    complexity?: string
    tags?: string[]
    summary?: string
    qualityScore?: number | null
    isGold?: boolean
    isSilver?: boolean
    [key: string]: any // Permite campos dinâmicos adicionais
  }
  // Campos legados para compatibilidade (extraídos do metadata)
  docType?: string
  area?: string
  jurisdiction?: string
  complexity?: string
  tags?: string[]
  summary?: string
  qualityScore?: number | null
  isGold?: boolean
  isSilver?: boolean
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
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false)
  const [editedMarkdown, setEditedMarkdown] = useState('')
  const [isSavingMarkdown, setIsSavingMarkdown] = useState(false)
  const [markdownViewMode, setMarkdownViewMode] = useState<'code' | 'preview'>('code')
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [isRegeneratingChunks, setIsRegeneratingChunks] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        if (data.template?.markdown) {
          setEditedMarkdown(data.template.markdown)
        }
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

  const handleEditMarkdown = () => {
    if (template?.markdown) {
      setEditedMarkdown(template.markdown)
      setIsEditingMarkdown(true)
    }
  }

  const handleCancelEdit = () => {
    if (template?.markdown) {
      setEditedMarkdown(template.markdown)
    }
    setIsEditingMarkdown(false)
  }

  const handleSaveMarkdown = async () => {
    if (!template) return

    setIsSavingMarkdown(true)
    try {
      const response = await fetch(`/api/documents/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdown: editedMarkdown }),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar markdown')
      }

      setTemplate({ ...template, markdown: editedMarkdown })
      setIsEditingMarkdown(false)
      toast.success('Markdown atualizado com sucesso')
    } catch (error) {
      console.error('Error saving markdown:', error)
      toast.error('Erro ao salvar markdown')
    } finally {
      setIsSavingMarkdown(false)
    }
  }

  const handleReprocessFull = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo DOCX')
      return
    }

    setIsReprocessing(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/documents/${fileId}/reprocess-full`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao reprocessar arquivo')
      }

      toast.success('Reprocessamento completo iniciado. Aguardando conclusão...')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Aguardar um pouco para o status ser resetado
      await new Promise(resolve => setTimeout(resolve, 500))

      // Iniciar polling para verificar o status
      let pollCount = 0
      const maxPolls = 300 // 5 minutos (300 * 2s)
      const pollInterval = 2000 // 2 segundos

      const checkStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/documents/${fileId}`)
          if (!statusResponse.ok) {
            return
          }

          const statusData = await statusResponse.json()
          const currentStatus = statusData.file?.status

          // Verificar se o status mudou para 'completed' ou 'rejected'
          if (currentStatus === 'completed' || currentStatus === 'rejected') {
            // Parar o polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }

            setIsReprocessing(false)

            // Mostrar notificação baseada no resultado
            if (currentStatus === 'completed') {
              toast.success('Reprocessamento completo concluído com sucesso!')
            } else if (currentStatus === 'rejected') {
              const reason = statusData.file?.rejectedReason || 'Motivo desconhecido'
              toast.error(`Reprocessamento falhou: ${reason}`)
            }

            // Recarregar dados
            setFile(statusData.file)
            setTemplate(statusData.template)
            setChunks(statusData.chunks || [])
            return
          }

          pollCount++
          if (pollCount >= maxPolls) {
            // Timeout após 5 minutos
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
            setIsReprocessing(false)
            toast.error('Timeout: O reprocessamento está demorando mais que o esperado.')
          }
        } catch (error) {
          console.error('Error checking status:', error)
        }
      }

      // Iniciar polling
      pollingIntervalRef.current = setInterval(checkStatus, pollInterval) as unknown as NodeJS.Timeout
    } catch (error) {
      console.error('Error reprocessing file:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao reprocessar arquivo')
      setIsReprocessing(false)
    }
  }

  const handleRegenerateChunks = async () => {
    setIsRegeneratingChunks(true)

    try {
      const response = await fetch(`/api/documents/${fileId}/regenerate-chunks`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao regenerar chunks')
      }

      const data = await response.json()
      toast.success(data.message || 'Chunks e embeddings regenerados com sucesso!')

      // Recarregar dados
      const refreshResponse = await fetch(`/api/documents/${fileId}`)
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        setFile(refreshData.file)
        setTemplate(refreshData.template)
        setChunks(refreshData.chunks || [])
      }
    } catch (error) {
      console.error('Error regenerating chunks:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao regenerar chunks')
    } finally {
      setIsRegeneratingChunks(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/documents/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao deletar arquivo')
      }

      const data = await response.json()
      toast.success(data.message || 'Arquivo e todos os dados relacionados foram excluídos com sucesso')
      
      // Redirecionar para a lista de arquivos
      router.push('/files')
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar arquivo')
      setIsDeleting(false)
    }
  }

  // Cleanup do polling quando o componente desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/files">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{file.fileName}</h1>
            <p className="text-muted-foreground">Detalhes do arquivo</p>
          </div>
        </div>
        <div className="flex justify-end">
          <ConfirmDialog
            trigger={
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Arquivo
                  </>
                )}
              </Button>
            }
            title="Excluir arquivo"
            description={`Tem certeza que deseja excluir o arquivo "${file.fileName}"? Esta ação não pode ser desfeita. Todos os dados relacionados (chunks, embeddings, templates) serão permanentemente excluídos.`}
            confirmText="Excluir"
            cancelText="Cancelar"
            onConfirm={handleDelete}
            variant="destructive"
          />
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
            <div>
              <p className="text-sm font-medium text-muted-foreground">Caminho Original</p>
              <p className="text-sm font-mono text-xs break-all">{file.filePath}</p>
            </div>
            {file.rejectedReason && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Motivo da Rejeição</p>
                <p className="text-sm text-red-600">{file.rejectedReason}</p>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">Ações</p>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Arquivo
                      </>
                    )}
                  </Button>
                }
                title="Excluir arquivo"
                description={`Tem certeza que deseja excluir o arquivo "${file.fileName}"? Esta ação não pode ser desfeita. Todos os dados relacionados (chunks, embeddings, templates) serão permanentemente excluídos.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={handleDelete}
                variant="destructive"
              />
            </div>
            {(file.status === 'completed' || file.status === 'rejected') && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Reprocessar Arquivo Completo
                  </p>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.doc,.pdf"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const fileName = file.name.toLowerCase()
                          const isValidFormat = fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileName.endsWith('.pdf')
                          if (!isValidFormat) {
                            toast.error('Apenas arquivos DOCX, DOC ou PDF são permitidos')
                            return
                          }
                          if (file.size > 50 * 1024 * 1024) {
                            toast.error('Arquivo muito grande (máximo 50MB)')
                            return
                          }
                          setSelectedFile(file)
                        }
                      }}
                      className="hidden"
                      id="reprocess-file-input"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isReprocessing}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {selectedFile ? selectedFile.name : 'Selecionar arquivo DOCX'}
                      </Button>
                      {selectedFile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          disabled={isReprocessing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="outline"
                          disabled={isReprocessing || !selectedFile}
                          className="w-full"
                        >
                          {isReprocessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Reprocessando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reprocessar Arquivo Completo
                            </>
                          )}
                        </Button>
                      }
                      title="Reprocessar arquivo completo"
                      description={
                        file.status === 'rejected'
                          ? 'Tem certeza que deseja reprocessar este arquivo rejeitado? Um novo arquivo DOCX será processado do zero (conversão, classificação, chunks e embeddings).'
                          : 'Tem certeza que deseja reprocessar este arquivo? Um novo arquivo DOCX será processado do zero, substituindo todo o processamento atual (conversão, classificação, chunks e embeddings).'
                      }
                      confirmText="Reprocessar"
                      cancelText="Cancelar"
                      onConfirm={handleReprocessFull}
                    />
                  </div>
                </div>
                {file.status === 'completed' && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Regenerar Chunks e Embeddings
                    </p>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="outline"
                          disabled={isRegeneratingChunks}
                          className="w-full"
                        >
                          {isRegeneratingChunks ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Regenerando...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Regenerar Chunks e Embeddings
                            </>
                          )}
                        </Button>
                      }
                      title="Regenerar chunks e embeddings"
                      description="Tem certeza que deseja regenerar os chunks e embeddings? O markdown atual será usado para gerar novos chunks e embeddings, substituindo os existentes."
                      confirmText="Regenerar"
                      cancelText="Cancelar"
                      onConfirm={handleRegenerateChunks}
                    />
                  </div>
                )}
              </div>
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
              {/* Extrai campos do metadata ou usa campos legados para compatibilidade */}
              {(() => {
                const metadata = template.metadata || {}
                const docType = template.docType || metadata.docType
                const area = template.area || metadata.area
                const complexity = template.complexity || metadata.complexity
                const jurisdiction = template.jurisdiction || metadata.jurisdiction || 'BR'
                const tags = template.tags || metadata.tags || []
                const summary = template.summary || metadata.summary
                const qualityScore = template.qualityScore ?? metadata.qualityScore ?? null
                const isGold = template.isGold ?? metadata.isGold ?? false
                const isSilver = template.isSilver ?? metadata.isSilver ?? false

                return (
                  <>
                    {docType && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                        <p className="text-sm">{docType}</p>
                      </div>
                    )}
                    {area && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Área</p>
                        <p className="text-sm">{area}</p>
                      </div>
                    )}
                    {complexity && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Complexidade</p>
                        <p className="text-sm">{complexity}</p>
                      </div>
                    )}
                    {jurisdiction && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Jurisdição</p>
                        <p className="text-sm">{jurisdiction}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Qualidade</p>
                      <div className="flex gap-2">
                        {isGold && <Badge className="bg-yellow-500">GOLD</Badge>}
                        {isSilver && <Badge className="bg-gray-400">SILVER</Badge>}
                        {qualityScore !== null && qualityScore !== undefined && (
                          <Badge variant="outline">{qualityScore}</Badge>
                        )}
                      </div>
                    </div>
                    {summary && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Resumo</p>
                        <p className="text-sm">{summary}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                      {tags && tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma tag</p>
                      )}
                    </div>
                    {/* Exibe outros campos dinâmicos do metadata */}
                    {template.metadata && Object.keys(template.metadata).length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Outros Campos
                        </p>
                        <div className="space-y-2">
                          {Object.entries(template.metadata)
                            .filter(([key]) => 
                              !['docType', 'area', 'jurisdiction', 'complexity', 'tags', 'summary', 'qualityScore', 'isGold', 'isSilver'].includes(key)
                            )
                            .map(([key, value]) => (
                              <div key={key}>
                                <p className="text-xs font-medium text-muted-foreground">
                                  {key}:
                                </p>
                                <p className="text-xs">
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {template && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Markdown</CardTitle>
              {!isEditingMarkdown ? (
                <div className="flex gap-2">
                  {markdownViewMode === 'code' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMarkdownViewMode('preview')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Preview
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMarkdownViewMode('code')}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      Ver Código
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleEditMarkdown}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSavingMarkdown}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveMarkdown}
                    disabled={isSavingMarkdown}
                  >
                    {isSavingMarkdown ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingMarkdown ? (
              <Textarea
                value={editedMarkdown}
                onChange={e => setEditedMarkdown(e.target.value)}
                className="font-mono text-xs min-h-[400px]"
                placeholder="Digite o markdown aqui..."
              />
            ) : markdownViewMode === 'preview' ? (
              <div className="prose prose-sm max-w-none bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                <ReactMarkdown>{template.markdown}</ReactMarkdown>
              </div>
            ) : (
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[600px] whitespace-pre-wrap">
                {template.markdown}
              </pre>
            )}
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
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                    {chunk.contentMarkdown}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
