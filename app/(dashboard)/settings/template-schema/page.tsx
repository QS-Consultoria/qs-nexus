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
import { SchemaForm } from '@/components/settings/schema-form'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, Edit2, Database, Zap, FileCode } from 'lucide-react'
import { TemplateSchemaConfig } from '@/lib/types/template-schema'
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

export default function TemplateSchemaSettingsPage() {
  const [configs, setConfigs] = useState<TemplateSchemaConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<TemplateSchemaConfig | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/template-schema/configs')
      if (!response.ok) throw new Error('Erro ao carregar schemas')
      const data = await response.json()
      setConfigs(data.configs)
    } catch (error) {
      toast.error('Erro ao carregar schemas')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleNew() {
    setEditingConfig(null)
    setIsDrawerOpen(true)
  }

  function handleEdit(config: TemplateSchemaConfig) {
    setEditingConfig(config)
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setEditingConfig(null)
  }

  async function handleSubmit(formData: {
    name: string
    fields: any[]
    isActive: boolean
  }) {
    try {
      setIsSubmitting(true)
      if (formData.fields.length === 0) {
        toast.error('Adicione pelo menos um campo')
        return
      }

      const url = editingConfig
        ? `/api/template-schema/configs/${editingConfig.id}`
        : '/api/template-schema/configs'
      const method = editingConfig ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar schema')
      }

      toast.success(editingConfig ? 'Schema atualizado' : 'Schema criado')
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
      const response = await fetch(`/api/template-schema/configs/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Erro ao deletar')
      toast.success('Schema deletado')
      fetchConfigs()
      setShowDeleteDialog(null)
    } catch (error) {
      toast.error('Erro ao deletar schema')
      console.error(error)
    }
  }

  const activeConfig = configs.find(c => c.isActive)

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Schema de Template</h2>
            <p className="text-muted-foreground">
              Configure o schema dinâmico de templates com campos personalizáveis
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Schema
          </Button>
        </div>

        {/* Lista de Schemas */}
        <Card>
          <CardHeader>
            <CardTitle>Schemas Existentes</CardTitle>
            <CardDescription>
              {activeConfig
                ? `Schema ativo: ${activeConfig.name}`
                : 'Nenhum schema ativo'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : configs.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Nenhum schema criado ainda</p>
                <Button variant="outline" onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Schema
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
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <FileCode className="h-4 w-4" />
                            {config.fields.length} campo{config.fields.length !== 1 ? 's' : ''}{' '}
                            definido{config.fields.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {config.fields.slice(0, 5).map((field, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {field.name || `Campo ${idx + 1}`}
                            </Badge>
                          ))}
                          {config.fields.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{config.fields.length - 5} mais
                            </Badge>
                          )}
                        </div>
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
              <SheetTitle>{editingConfig ? 'Editar Schema' : 'Novo Schema'}</SheetTitle>
              <SheetDescription>
                {editingConfig
                  ? 'Atualize os campos abaixo e salve as alterações'
                  : 'Crie um novo schema de template'}
              </SheetDescription>
            </SheetHeader>
            <SchemaForm
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
                Tem certeza que deseja deletar este schema? Esta ação não pode ser desfeita.
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
