'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/upload/file-upload'
import { ProcessingProgress } from '@/components/upload/processing-progress'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { Upload } from 'lucide-react'

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo')
      return
    }

    setIsUploading(true)

    try {
      // Upload dos arquivos
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Erro ao fazer upload')
      }

      const uploadData = await uploadResponse.json()
      toast.success(`${uploadData.files.length} arquivo(s) enviado(s)`)

      // Iniciar processamento
      setIsProcessing(true)
      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: uploadData.files }),
      })

      if (!processResponse.ok) {
        throw new Error('Erro ao iniciar processamento')
      }

      const processData = await processResponse.json()
      setJobId(processData.jobId)
      toast.success('Processamento iniciado')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Erro ao processar arquivos')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Upload de Arquivos</h1>
        <p className="text-muted-foreground">
          Envie arquivos DOCX para processamento no pipeline RAG
        </p>
      </div>

      <FileUpload onFilesSelected={handleFilesSelected} />

      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading || isProcessing}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Enviando...' : isProcessing ? 'Processando...' : 'Processar Arquivos'}
        </Button>
      </div>

      {jobId && <ProcessingProgress jobId={jobId} />}
    </div>
  )
}
