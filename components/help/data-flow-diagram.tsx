'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowRight, Database, FileText, Search, Sparkles, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROCESSING_FLOWS, DATABASE_TABLES } from '@/lib/constants/processing-tooltips'

interface FlowNode {
  id: string
  title: string
  description: string
  icon: typeof Upload
  color: string
  details: string
  tables?: string[]
}

const FLOW_NODES: FlowNode[] = [
  {
    id: '1-upload',
    title: '1. Upload',
    description: 'Arquivo enviado',
    icon: Upload,
    color: 'bg-blue-500',
    details: 'O usuário seleciona e envia o arquivo através da interface. O arquivo é validado (tipo, tamanho) e enviado para o servidor via FormData.',
    tables: ['documents'],
  },
  {
    id: '2-server',
    title: '2. Servidor',
    description: 'Salvo no disco',
    icon: Database,
    color: 'bg-purple-500',
    details: 'O servidor recebe o arquivo, calcula hash SHA-256, cria diretórios necessários e salva fisicamente em public/uploads/{org}/{year}/{month}/{hash}-{nome}.',
    tables: ['documents'],
  },
  {
    id: '3-normalize',
    title: '3. Normalização',
    description: 'Conversão para Markdown',
    icon: FileText,
    color: 'bg-green-500',
    details: 'O documento é convertido para Markdown canônico, preservando estrutura (títulos, listas, parágrafos). PDF usa pdf-parse, DOCX usa mammoth.',
    tables: ['document_files'],
  },
  {
    id: '4-classify',
    title: '4. Classificação',
    description: 'Extração de metadados com IA',
    icon: Sparkles,
    color: 'bg-yellow-500',
    details: 'GPT-4 analisa o documento e extrai metadados estruturados: tipo de documento, área jurídica, partes envolvidas, datas importantes. O resultado é um Template (schema).',
    tables: ['templates'],
  },
  {
    id: '5-chunk',
    title: '5. Chunks',
    description: 'Divisão em pedaços',
    icon: FileText,
    color: 'bg-orange-500',
    details: 'O documento é dividido em chunks de até 800 tokens cada, respeitando limites de parágrafos e seções. Cada chunk será vetorizado individualmente.',
    tables: ['template_chunks'],
  },
  {
    id: '6-embed',
    title: '6. Embeddings',
    description: 'Geração de vetores',
    icon: Sparkles,
    color: 'bg-pink-500',
    details: 'Cada chunk é transformado em um vetor de 1536 dimensões usando text-embedding-3-small da OpenAI. Vetores capturam o significado semântico do texto.',
    tables: ['template_chunks'],
  },
  {
    id: '7-store',
    title: '7. NeonDB',
    description: 'Armazenamento vetorial',
    icon: Database,
    color: 'bg-teal-500',
    details: 'Chunks e embeddings são salvos no PostgreSQL (NeonDB) com extensão pgvector. Agora está disponível para busca semântica e uso pelo assistente de IA.',
    tables: ['template_chunks'],
  },
  {
    id: '8-search',
    title: '8. Busca Semântica',
    description: 'Pronto para uso',
    icon: Search,
    color: 'bg-indigo-500',
    details: 'O documento está indexado e pode ser usado. Quando o usuário faz uma pergunta, o sistema busca chunks similares usando similaridade de cosseno nos vetores (pgvector).',
    tables: ['template_chunks'],
  },
]

interface DataFlowDiagramProps {
  type?: 'general' | 'csv' | 'sped'
}

export function DataFlowDiagram({ type = 'general' }: DataFlowDiagramProps) {
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)
  
  const flow = PROCESSING_FLOWS[type]
  
  // Filtra nós relevantes baseado no tipo
  const relevantNodes = type === 'general' 
    ? FLOW_NODES 
    : FLOW_NODES.filter(node => {
        // Para CSV e SPED, mostrar apenas upload, servidor e armazenamento
        return ['1-upload', '2-server', '7-store'].includes(node.id)
      })

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fluxo Completo de Processamento</CardTitle>
              <CardDescription>
                Clique em cada etapa para ver detalhes
              </CardDescription>
            </div>
            <Badge variant="outline">{flow.name}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Diagrama visual */}
          <div className="relative">
            {/* Versão Desktop: Horizontal */}
            <div className="hidden lg:flex items-start justify-between gap-4 overflow-x-auto pb-4">
              {relevantNodes.map((node, index) => (
                <div key={node.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedNode(node)}
                    className={cn(
                      'flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg',
                      'min-w-[140px] cursor-pointer',
                      'bg-white dark:bg-gray-900'
                    )}
                  >
                    <div className={cn('p-3 rounded-full', node.color)}>
                      <node.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">{node.title.split('. ')[1]}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {node.description}
                      </p>
                    </div>
                  </button>
                  
                  {index < relevantNodes.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-gray-400 mx-2 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Versão Mobile: Vertical */}
            <div className="lg:hidden space-y-3">
              {relevantNodes.map((node, index) => (
                <div key={node.id}>
                  <button
                    onClick={() => setSelectedNode(node)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-lg w-full',
                      'bg-white dark:bg-gray-900'
                    )}
                  >
                    <div className={cn('p-3 rounded-full shrink-0', node.color)}>
                      <node.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{node.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {node.description}
                      </p>
                    </div>
                  </button>
                  
                  {index < relevantNodes.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold text-sm mb-3">Tabelas do Banco de Dados</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(DATABASE_TABLES).map(([key, table]) => (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <Database className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-mono font-semibold">{table.name}</p>
                    <p className="text-xs text-muted-foreground">{table.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={selectedNode !== null} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="max-w-2xl">
          {selectedNode && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn('p-3 rounded-full', selectedNode.color)}>
                    <selectedNode.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle>{selectedNode.title}</DialogTitle>
                    <DialogDescription>{selectedNode.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">O que acontece?</h4>
                  <p className="text-sm text-muted-foreground">{selectedNode.details}</p>
                </div>

                {selectedNode.tables && selectedNode.tables.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Tabelas Envolvidas</h4>
                    <div className="space-y-2">
                      {selectedNode.tables.map(tableName => {
                        const table = Object.values(DATABASE_TABLES).find(t => t.name === tableName)
                        if (!table) return null
                        
                        return (
                          <div
                            key={tableName}
                            className="p-3 rounded-lg bg-muted border"
                          >
                            <p className="font-mono font-semibold text-sm">{table.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{table.purpose}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {table.fields.slice(0, 5).map(field => (
                                <Badge key={field} variant="secondary" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                              {table.fields.length > 5 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{table.fields.length - 5}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

