'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Play, 
  Plus, 
  Eye, 
  Trash2, 
  Workflow as WorkflowIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Workflow {
  id: string
  name: string
  description: string | null
  category: string | null
  version: string
  isShared: boolean
  isActive: boolean
  tags: string[] | null
  createdAt: string
}

interface Execution {
  id: string
  workflowTemplateId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  input: any
  output: any
  error: string | null
  progress: string | null
  createdAt: string
  completedAt: string | null
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionInput, setExecutionInput] = useState('')

  useEffect(() => {
    loadWorkflows()
    loadExecutions()
  }, [])

  const loadWorkflows = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/workflows')
      if (!response.ok) throw new Error('Erro ao carregar workflows')
      const data = await response.json()
      setWorkflows(data.workflows || [])
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar workflows')
    } finally {
      setIsLoading(false)
    }
  }

  const loadExecutions = async () => {
    try {
      const response = await fetch('/api/workflows/executions?limit=20')
      if (!response.ok) throw new Error('Erro ao carregar execuções')
      const data = await response.json()
      setExecutions(data.executions || [])
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleExecute = async () => {
    if (!selectedWorkflow) return

    try {
      setIsExecuting(true)
      
      // Parse input JSON
      let inputData = {}
      if (executionInput.trim()) {
        try {
          inputData = JSON.parse(executionInput)
        } catch (e) {
          toast.error('Input JSON inválido')
          return
        }
      }

      const response = await fetch(`/api/workflows/${selectedWorkflow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputData,
          executionMode: 'async',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao executar workflow')
      }

      const data = await response.json()
      toast.success('Workflow iniciado com sucesso!')
      setIsExecuteDialogOpen(false)
      setExecutionInput('')
      loadExecutions()
    } catch (error) {
      console.error('Erro:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao executar workflow')
    } finally {
      setIsExecuting(false)
    }
  }

  const getStatusIcon = (status: Execution['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: Execution['status']) => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline',
      cancelled: 'outline',
    }
    return variants[status] || 'outline'
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <WorkflowIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Carregando workflows...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Execute workflows de automação e análise
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Novo Workflow
        </Button>
      </div>

      {/* Workflows Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Workflows Disponíveis</CardTitle>
          <CardDescription>
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} disponível
            {workflows.length !== 1 ? 'is' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <div className="text-center py-12">
              <WorkflowIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum workflow disponível</p>
              <p className="text-sm text-muted-foreground mt-1">
                Workflows serão exibidos aqui quando criados
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Compartilhado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workflow.name}</div>
                        {workflow.description && (
                          <div className="text-sm text-muted-foreground">
                            {workflow.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {workflow.category && (
                        <Badge variant="outline">{workflow.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{workflow.version}</Badge>
                    </TableCell>
                    <TableCell>
                      {workflow.isShared ? (
                        <Badge>Compartilhado</Badge>
                      ) : (
                        <Badge variant="outline">Privado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedWorkflow(workflow)
                          setIsExecuteDialogOpen(true)
                        }}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Executar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Execuções */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Execuções</CardTitle>
          <CardDescription>
            Últimas {executions.length} execuções
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma execução recente</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Iniciado</TableHead>
                  <TableHead>Concluído</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution) => {
                  const workflow = workflows.find(w => w.id === execution.workflowTemplateId)
                  return (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(execution.status)}
                          <Badge variant={getStatusBadge(execution.status)}>
                            {execution.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {workflow ? workflow.name : execution.workflowTemplateId.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {execution.progress ? `${execution.progress}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(execution.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        {execution.completedAt
                          ? formatDistanceToNow(new Date(execution.completedAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Execução */}
      <Dialog open={isExecuteDialogOpen} onOpenChange={setIsExecuteDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Executar Workflow</DialogTitle>
            <DialogDescription>
              {selectedWorkflow?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="input">Input (JSON)</Label>
              <Textarea
                id="input"
                placeholder='{"key": "value"}'
                value={executionInput}
                onChange={(e) => setExecutionInput(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Forneça os dados de entrada para o workflow em formato JSON
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExecuteDialogOpen(false)}
              disabled={isExecuting}
            >
              Cancelar
            </Button>
            <Button onClick={handleExecute} disabled={isExecuting}>
              {isExecuting ? 'Executando...' : 'Executar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

