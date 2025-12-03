'use client'

import { useState, useCallback } from 'react'
import { FileUpload } from '@/components/upload/file-upload'
import { ProcessingProgress } from '@/components/upload/processing-progress'
import { SpedProcessingProgress } from '@/components/upload/sped-processing-progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-hot-toast'
import { useOrganization } from '@/lib/contexts/organization-context'
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface IngestResult {
  success: boolean
  type: 'sped' | 'csv' | 'document'
  fileName: string
  stats?: Record<string, number>
  errors?: Array<{ line: number; message: string }>
}

export default function UploadPage() {
  const { currentOrg } = useOrganization()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [ingestResults, setIngestResults] = useState<IngestResult[]>([])

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
    setIngestResults([])
  }

  const handleJobComplete = useCallback(() => {
    setIsProcessing(false)
  }, [])

  // Upload tradicional (documentos para RAG)
  const handleDocumentUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo')
      return
    }

    if (!currentOrg?.id) {
      toast.error('Nenhuma organização selecionada')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })
      // ✅ ADICIONA organizationId obrigatório
      formData.append('organizationId', currentOrg.id)

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Erro ao fazer upload')
      }

      const uploadData = await uploadResponse.json()
      toast.success(uploadData.message || `${uploadData.documents.length} arquivo(s) enviado(s)`)

      // Iniciar processamento automático
      setIsProcessing(true)
      const documentIds = uploadData.documents.map((doc: any) => doc.id)
      
      // Processar cada documento
      for (const docId of documentIds) {
        try {
          await fetch(`/api/documents/${docId}/process`, {
            method: 'POST',
          })
        } catch (err) {
          console.error(`Erro ao processar documento ${docId}:`, err)
        }
      }
      
      toast.success('Processamento iniciado para todos os arquivos')
      
      // Limpar seleção
      setSelectedFiles([])
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivos')
      setIsProcessing(false)
    } finally {
      setIsUploading(false)
    }
  }

  // Upload SPED
  const handleSpedUpload = async () => {
    const spedFiles = selectedFiles.filter(
      f => f.name.toLowerCase().endsWith('.txt') || f.name.toLowerCase().endsWith('.sped')
    )

    if (spedFiles.length === 0) {
      toast.error('Selecione arquivos SPED (.txt ou .sped)')
      return
    }

    if (spedFiles.length > 1) {
      toast.error('Por favor, selecione apenas um arquivo SPED por vez')
      return
    }

    setIsUploading(true)

    try {
      const file = spedFiles[0]
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ingest/sped', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.jobId) {
        toast.success(`Processamento iniciado! Tempo estimado: ${data.estimatedTime}`)
        setJobId(data.jobId)
        setIsProcessing(true)
      } else {
        toast.error(`Erro: ${data.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('SPED upload error:', error)
      toast.error('Erro ao iniciar processamento SPED')
    } finally {
      setIsUploading(false)
    }
  }

  // Upload CSV
  const handleCsvUpload = async () => {
    const csvFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.csv'))

    if (csvFiles.length === 0) {
      toast.error('Selecione arquivos CSV (.csv)')
      return
    }

    setIsUploading(true)
    const results: IngestResult[] = []

    for (const file of csvFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/ingest/csv', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        results.push({
          success: response.ok,
          type: 'csv',
          fileName: file.name,
          stats: data.stats,
          errors: data.errors,
        })

        if (response.ok) {
          toast.success(`CSV importado: ${data.stats?.processedRows} linhas`)
        } else {
          toast.error(`Erro em ${file.name}: ${data.error}`)
        }
      } catch (error) {
        results.push({
          success: false,
          type: 'csv',
          fileName: file.name,
          errors: [{ line: 0, message: 'Erro de conexão' }],
        })
        toast.error(`Erro ao processar ${file.name}`)
      }
    }

    setIngestResults(results)
    setIsUploading(false)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Ingestão de Dados</h1>
        <p className="text-muted-foreground">
          Importe dados de arquivos SPED, CSV ou documentos para análise
        </p>
      </div>

      <Tabs defaultValue="sped" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sped" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            SPED
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        {/* SPED Tab */}
        <TabsContent value="sped" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-500" />
                Importar SPED
              </CardTitle>
              <CardDescription>
                Importe arquivos SPED (ECD, ECF, EFD) para normalização e análise SQL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFilesSelected={handleFilesSelected}
                acceptedTypes={['.txt', '.sped']}
                maxFiles={5}
              />

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Suportados</Badge>
                <span>ECD, ECF, EFD-ICMS/IPI, EFD-Contribuições</span>
              </div>

              <Button
                onClick={handleSpedUpload}
                disabled={selectedFiles.length === 0 || isUploading || isProcessing}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Iniciando processamento...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar SPED
                  </>
                )}
              </Button>

              {jobId && isProcessing && (
                <SpedProcessingProgress 
                  jobId={jobId} 
                  fileName={selectedFiles[0]?.name}
                  onComplete={handleJobComplete} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Tab */}
        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                Importar CSV
              </CardTitle>
              <CardDescription>
                Importe planilhas CSV para análise. Delimitador detectado automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload onFilesSelected={handleFilesSelected} acceptedTypes={['.csv']} maxFiles={10} />

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Auto-detecta</Badge>
                <span>Delimitador (vírgula, ponto-e-vírgula, tab) e encoding</span>
              </div>

              <Button
                onClick={handleCsvUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando CSV...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Documentos RAG
              </CardTitle>
              <CardDescription>
                Importe documentos PDF, DOCX ou TXT para vetorização e busca semântica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFilesSelected={handleFilesSelected}
                acceptedTypes={['.pdf', '.docx', '.doc', '.txt']}
                maxFiles={20}
              />

              <Button
                onClick={handleDocumentUpload}
                disabled={selectedFiles.length === 0 || isUploading || isProcessing}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Processar Documentos
                  </>
                )}
              </Button>

              {jobId && <ProcessingProgress jobId={jobId} onComplete={handleJobComplete} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resultados da Ingestão */}
      {ingestResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Importação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ingestResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{result.fileName}</p>
                      {result.stats && (
                        <p className="text-sm text-muted-foreground">
                          {result.type === 'sped' && (
                            <>
                              {result.stats.accounts} contas • {result.stats.balances} saldos •{' '}
                              {result.stats.entries} lançamentos
                            </>
                          )}
                          {result.type === 'csv' && <>{result.stats.processedRows} linhas processadas</>}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? 'Sucesso' : 'Erro'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
