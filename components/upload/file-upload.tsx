'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Folder, X, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  maxSize?: number // em MB
}

export function FileUpload({ onFilesSelected, maxSize = 50 }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return

      const validFiles: File[] = []
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        if (file.name.endsWith('.docx')) {
          if (file.size <= maxSize * 1024 * 1024) {
            validFiles.push(file)
          }
        }
      }
      setFiles(prev => [...prev, ...validFiles])
      onFilesSelected([...files, ...validFiles])
    },
    [files, onFilesSelected, maxSize]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const removeFile = useCallback(
    (index: number) => {
      setFiles(prev => {
        const newFiles = prev.filter((_, i) => i !== index)
        onFilesSelected(newFiles)
        return newFiles
      })
    },
    [onFilesSelected]
  )

  const handleFolderSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
    },
    [handleFileSelect]
  )

  return (
    <div className="space-y-4">
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted'
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center p-12">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-2">
            Arraste arquivos DOCX aqui ou clique para selecionar
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Tamanho máximo: {maxSize}MB por arquivo
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Selecionar Arquivos
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('folder-input')?.click()}
            >
              <Folder className="h-4 w-4 mr-2" />
              Selecionar Pasta
            </Button>
          </div>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".docx"
            className="hidden"
            onChange={e => handleFileSelect(e.target.files)}
          />
          <input
            id="folder-input"
            type="file"
            {...({ webkitdirectory: '' } as any)}
            multiple
            accept=".docx"
            className="hidden"
            onChange={handleFolderSelect}
          />
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{files.length} arquivo(s) selecionado(s)</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remover arquivo</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
