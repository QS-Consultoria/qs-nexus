'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Upload, X, FileIcon, Loader2, Info, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useOrganization } from '@/lib/contexts/organization-context'
import { validateFileType, validateFileSize, formatFileSize } from '@/lib/utils/file-upload'
import { DOCUMENT_TYPES, PIPELINE_STEPS } from '@/lib/constants/processing-tooltips'

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  documentType: 'general' | 'csv' | 'sped'
  acceptedFileTypes: string
  maxSizeMB: number
  title?: string
  description?: string
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  documentType,
  acceptedFileTypes,
  maxSizeMB,
  title = 'Upload de Arquivos',
  description = 'Selecione arquivos para upload',
}: DocumentUploadDialogProps) {
  const { currentOrg } = useOrganization()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showPipelinePreview, setShowPipelinePreview] = useState(false)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const acceptedTypesArray = acceptedFileTypes.split(',').map(t => t.trim())
    
    const validFiles = files.filter(file => {
      if (!validateFileType(file, acceptedTypesArray)) {
        toast.error(`${file.name}: tipo de arquivo não aceito`)
        return false
      }
      if (!validateFileSize(file, maxSizeMB)) {
        toast.error(`${file.name}: arquivo muito grande (máx: ${maxSizeMB}MB)`)
        return false
      }
      return true
    })

    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [acceptedFileTypes, maxSizeMB])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const acceptedTypesArray = acceptedFileTypes.split(',').map(t => t.trim())
    
    const validFiles = files.filter(file => {
      if (!validateFileType(file, acceptedTypesArray)) {
        toast.error(`${file.name}: tipo de arquivo não aceito`)
        return false
      }
      if (!validateFileSize(file, maxSizeMB)) {
        toast.error(`${file.name}: arquivo muito grande (máx: ${maxSizeMB}MB)`)
        return false
      }
      return true
    })

    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [acceptedFileTypes, maxSizeMB])

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!currentOrg) {
      toast.error('Selecione uma organização primeiro')
      return
    }

    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // SPED processa arquivos individualmente de forma assíncrona
      if (documentType === 'sped') {
        // Processar apenas o primeiro arquivo SPED
        const file = selectedFiles[0]
        const formData = new FormData()
        formData.append('file', file) // Singular 'file' para /api/ingest/sped
        
        const response = await fetch('/api/ingest/sped', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao fazer upload do arquivo SPED')
        }

        const data = await response.json()
        
        // Mensagem de sucesso com jobId para acompanhamento
        toast.success(
          `Upload iniciado! O arquivo será processado em segundo plano. ${data.estimatedTime ? `Tempo estimado: ${data.estimatedTime}` : ''}`,
          { duration: 5000 }
        )
        
        setSelectedFiles([])
        onOpenChange(false)
        onSuccess()
        
      } else {
        // CSV e documentos gerais: upload em lote
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })
      formData.append('organizationId', currentOrg.id)
      formData.append('documentType', documentType)

        const endpoint = documentType === 'csv'
        ? '/api/csv/upload'
        : '/api/documents/upload'

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload')
      }

      const data = await response.json()
      toast.success(`${selectedFiles.length} arquivo(s) enviado(s) com sucesso!`)
      
      setSelectedFiles([])
      onOpenChange(false)
      onSuccess()
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Erro ao fazer upload')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Informações do tipo de upload */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {documentType === 'sped' && 'SPED Contábil - Processamento Especializado'}
                  {documentType === 'csv' && 'Planilhas CSV - Importação de Dados'}
                  {documentType === 'general' && 'Documentos - Pipeline RAG Completo'}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPipelinePreview(!showPipelinePreview)}
                        className="h-7"
                      >
                        {showPipelinePreview ? 'Ocultar' : 'Ver'} Pipeline
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver as etapas de processamento</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {documentType === 'sped' && 'Extrai plano de contas, saldos e lançamentos contábeis'}
                {documentType === 'csv' && 'Importa dados tabulares para o sistema'}
                {documentType === 'general' && 'Converte para Markdown, classifica com IA e gera embeddings para busca semântica'}
              </p>
              
              {/* Preview do Pipeline */}
              {showPipelinePreview && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {PIPELINE_STEPS.slice(1, documentType === 'general' ? 8 : 4).map((step, index, arr) => (
                      <div key={step.id} className="flex items-center shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <span className="text-sm">{step.icon}</span>
                                <span className="text-xs font-medium whitespace-nowrap">{step.name}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold text-sm">{step.name}</p>
                              <p className="text-xs mt-1">{step.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {index < arr.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-gray-400 mx-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Tipos aceitos: {acceptedFileTypes} | Máx: {maxSizeMB}MB
            </p>
            <Input
              type="file"
              multiple
              accept={acceptedFileTypes}
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
              disabled={!currentOrg}
            />
            <Label htmlFor="file-input">
              <Button variant="outline" disabled={!currentOrg} asChild>
                <span>Selecionar Arquivos</span>
              </Button>
            </Label>
          </div>

          {/* Aviso para SPED */}
          {documentType === 'sped' && selectedFiles.length > 1 && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Apenas o primeiro arquivo será processado. Arquivos SPED são processados individualmente.
              </p>
            </div>
          )}
<<<<<<< Current (Your changes)
=======
          
          {!currentOrg && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Selecione uma organização no menu lateral para fazer upload
              </p>
            </div>
          )}
>>>>>>> Incoming (Background Agent changes)

          {/* Lista de arquivos selecionados */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Arquivos Selecionados ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  // Determinar tipo do arquivo
                  const ext = file.name.split('.').pop()?.toLowerCase()
                  const docType = Object.values(DOCUMENT_TYPES).find(dt => 
                    dt.extensions.some(e => e.includes(ext || ''))
                  )
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="shrink-0">
                          {docType ? (
                            <span className="text-2xl">{docType.icon}</span>
                          ) : (
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            {docType && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {docType.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatFileSize(file.size)}
                            {docType && ` • ${docType.description.split(' ')[0]}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(index)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Barra de progresso */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Enviando...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || selectedFiles.length === 0 || !currentOrg}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Fazer Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

