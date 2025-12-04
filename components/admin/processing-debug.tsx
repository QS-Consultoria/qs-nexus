'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Code, 
  Play, 
  RefreshCw, 
  Database, 
  FileText, 
  Sparkles,
  Terminal,
  AlertCircle 
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { DataFlowDiagram } from '@/components/help/data-flow-diagram'

interface ProcessingDebugProps {
  documentId?: string
}

export function ProcessingDebug({ documentId }: ProcessingDebugProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [documentData, setDocumentData] = useState<any>(null)

  const handleReprocess = async () => {
    if (!documentId) {
      toast.error('Nenhum documento selecionado')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/process`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erro ao reprocessar documento')
      }

      toast.success('Reprocessamento iniciado!')
      loadDocumentData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDocumentData = async () => {
    if (!documentId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setDocumentData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Painel de Debug - Processamento
              </CardTitle>
              <CardDescription>
                Ferramentas para desenvolvedores e administradores
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-2">
              <AlertCircle className="h-3 w-3" />
              Apenas Super Admin
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="flow">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="flow">Fluxo</TabsTrigger>
          <TabsTrigger value="test">Testar Etapas</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="db">Banco de Dados</TabsTrigger>
        </TabsList>

        {/* Diagrama de Fluxo */}
        <TabsContent value="flow" className="space-y-4">
          <DataFlowDiagram type="general" />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentação Técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2">Arquivos de Documentação</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/FLUXO_DADOS_DETALHADO.md</code> - Documentação completa</li>
                  <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">FLUXO_PROCESSAMENTO_DOCUMENTOS.md</code> - Resumo do pipeline</li>
                  <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">lib/constants/processing-tooltips.ts</code> - Tooltips e glossário</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testar Etapas */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Testar Etapas Individuais</CardTitle>
              <CardDescription>
                Execute e teste cada etapa do pipeline separadamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Conversão */}
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">1. Conversão para Markdown</h4>
                      <p className="text-xs text-muted-foreground">Testa o conversor de documentos</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    <Play className="h-3 w-3 mr-1" />
                    Testar
                  </Button>
                </div>
                <code className="text-xs block bg-muted p-2 rounded">
                  convertDocument(filePath)
                </code>
              </div>

              {/* Classificação */}
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="font-semibold">2. Classificação com IA</h4>
                      <p className="text-xs text-muted-foreground">Testa extração de metadados</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    <Play className="h-3 w-3 mr-1" />
                    Testar
                  </Button>
                </div>
                <code className="text-xs block bg-muted p-2 rounded">
                  classifyDocument(markdown)
                </code>
              </div>

              {/* Chunks */}
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-semibold">3. Geração de Chunks</h4>
                      <p className="text-xs text-muted-foreground">Testa divisão em pedaços</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    <Play className="h-3 w-3 mr-1" />
                    Testar
                  </Button>
                </div>
                <code className="text-xs block bg-muted p-2 rounded">
                  chunkMarkdown(markdown, 800)
                </code>
              </div>

              {/* Embeddings */}
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-600" />
                    <div>
                      <h4 className="font-semibold">4. Geração de Embeddings</h4>
                      <p className="text-xs text-muted-foreground">Testa vetorização</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    <Play className="h-3 w-3 mr-1" />
                    Testar
                  </Button>
                </div>
                <code className="text-xs block bg-muted p-2 rounded">
                  generateEmbeddings(texts, 64)
                </code>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 Os testes individuais estarão disponíveis em uma futura atualização. Por enquanto, use os scripts em <code className="bg-muted px-1 py-0.5 rounded">scripts/</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Logs de Processamento</CardTitle>
                  <CardDescription>Acompanhe o processamento em tempo real</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setLogs([])}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-black rounded-lg p-4 font-mono text-xs text-green-400 h-[400px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500">
                    Nenhum log disponível. Faça upload de um documento para ver os logs.
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Logs em tempo real virão da conexão SSE (Server-Sent Events)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banco de Dados */}
        <TabsContent value="db" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consultas Úteis</CardTitle>
              <CardDescription>Queries SQL para debug</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Ver Documentos Pendentes</h4>
                <code className="text-xs block bg-muted p-3 rounded overflow-x-auto">
                  SELECT id, file_name, status, created_at<br />
                  FROM documents<br />
                  WHERE status = 'pending'<br />
                  ORDER BY created_at DESC;
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Ver Template de Documento</h4>
                <code className="text-xs block bg-muted p-3 rounded overflow-x-auto">
                  SELECT t.*, df.file_name<br />
                  FROM templates t<br />
                  JOIN document_files df ON t.document_file_id = df.id<br />
                  WHERE df.id = 'uuid-aqui';
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Contar Chunks por Documento</h4>
                <code className="text-xs block bg-muted p-3 rounded overflow-x-auto">
                  SELECT t.id, df.file_name, COUNT(tc.id) as chunks<br />
                  FROM templates t<br />
                  JOIN document_files df ON t.document_file_id = df.id<br />
                  LEFT JOIN template_chunks tc ON tc.template_id = t.id<br />
                  GROUP BY t.id, df.file_name<br />
                  ORDER BY chunks DESC;
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Testar Busca Vetorial</h4>
                <code className="text-xs block bg-muted p-3 rounded overflow-x-auto">
                  SELECT chunk_index, content,<br />
                  &nbsp;&nbsp;embedding &lt;=&gt; &apos;[...]&apos; as distance<br />
                  FROM template_chunks<br />
                  WHERE template_id = &apos;uuid-aqui&apos;<br />
                  ORDER BY distance LIMIT 5;
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ações Rápidas */}
      {documentId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={handleReprocess} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Reprocessar Documento
            </Button>
            <Button variant="outline" onClick={loadDocumentData} disabled={isLoading}>
              <Database className="h-4 w-4 mr-2" />
              Carregar Dados
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

