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
import { Upload, X, FileIcon, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useOrganization } from '@/lib/contexts/organization-context'
import { validateFileType, validateFileSize, formatFileSize } from '@/lib/utils/file-upload'

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
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })
      formData.append('organizationId', currentOrg.id)
      formData.append('documentType', documentType)

      // Escolher endpoint baseado no tipo
      const endpoint = documentType === 'sped' 
        ? '/api/sped/upload' 
        : documentType === 'csv'
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
          {/* Organização atual */}
          {currentOrg && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📁 Upload para: <strong>{currentOrg.name}</strong>
              </p>
            </div>
          )}

          {!currentOrg && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Selecione uma organização no menu lateral primeiro
              </p>
            </div>
          )}

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

          {/* Lista de arquivos selecionados */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Arquivos Selecionados ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
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
                ))}
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

