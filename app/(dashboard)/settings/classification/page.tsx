'use client'

import { useState, useEffect } from 'react'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ClassificationForm } from '@/components/settings/classification-form'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, Edit2, FileCode, Zap, Settings2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ClassificationConfig {
  id: string
  name: string
  systemPrompt: string
  modelProvider: 'openai' | 'google'
  modelName: string
  maxInputTokens: number
  maxOutputTokens: number
  extractionFunctionCode?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ClassificationSettingsPage() {
  const [configs, setConfigs] = useState<ClassificationConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ClassificationConfig | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/classification/configs')
      if (!response.ok) throw new Error('Erro ao carregar configurações')
      const data = await response.json()
      setConfigs(data.configs)
    } catch (error) {
      toast.error('Erro ao carregar configurações')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleNew() {
    setEditingConfig(null)
    setIsDrawerOpen(true)
  }

  function handleEdit(config: ClassificationConfig) {
    setEditingConfig(config)
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setEditingConfig(null)
  }

  async function handleSubmit(formData: {
    name: string
    systemPrompt: string
    modelProvider: 'openai' | 'google'
    modelName: string
    maxInputTokens: number
    maxOutputTokens: number
    extractionFunctionCode?: string
    isActive: boolean
  }) {
    try {
      setIsSubmitting(true)
      const url = editingConfig
        ? `/api/classification/configs/${editingConfig.id}`
        : '/api/classification/configs'
      const method = editingConfig ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar configuração')
      }

      toast.success(editingConfig ? 'Configuração atualizada' : 'Configuração criada')
      handleCloseDrawer()
      fetchConfigs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/classification/configs/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Erro ao deletar')
      toast.success('Configuração deletada')
      fetchConfigs()
      setShowDeleteDialog(null)
    } catch (error) {
      toast.error('Erro ao deletar configuração')
      console.error(error)
    }
  }

  const activeConfig = configs.find(c => c.isActive)

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Configurações de Classificação</h2>
            <p className="text-muted-foreground">
              Gerencie modelos de IA, prompts e funções de extração para classificação de documentos
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Configuração
          </Button>
        </div>

        {/* Lista de Configurações */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Existentes</CardTitle>
            <CardDescription>
              {activeConfig
                ? `Configuração ativa: ${activeConfig.name}`
                : 'Nenhuma configuração ativa'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : configs.length === 0 ? (
              <div className="text-center py-12">
                <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Nenhuma configuração criada ainda</p>
                <Button variant="outline" onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Configuração
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {configs.map(config => (
                  <Card
                    key={config.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEdit(config)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{config.name}</CardTitle>
                            {config.isActive && (
                              <Badge className="bg-primary text-primary-foreground">
                                <Zap className="h-3 w-3 mr-1" />
                                Ativa
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Settings2 className="h-4 w-4" />
                            {config.modelProvider === 'openai' ? 'OpenAI' : 'Google'} /{' '}
                            {config.modelName}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Input Tokens:</span>
                          <span className="font-medium">{config.maxInputTokens.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Output Tokens:</span>
                          <span className="font-medium">
                            {config.maxOutputTokens.toLocaleString()}
                          </span>
                        </div>
                        {config.extractionFunctionCode && (
                          <div className="pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              Função customizada configurada
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={e => {
                            e.stopPropagation()
                            handleEdit(config)
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={e => {
                            e.stopPropagation()
                            setShowDeleteDialog(config.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drawer para Criar/Editar */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
              </SheetTitle>
              <SheetDescription>
                {editingConfig
                  ? 'Atualize os campos abaixo e salve as alterações'
                  : 'Crie uma nova configuração de classificação'}
              </SheetDescription>
            </SheetHeader>
            <ClassificationForm
              config={editingConfig || undefined}
              onSubmit={handleSubmit}
              onCancel={handleCloseDrawer}
              isLoading={isSubmitting}
            />
          </SheetContent>
        </Sheet>

        {/* Dialog de Confirmação de Delete */}
        <AlertDialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar esta configuração? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsLayout>
  )
}
