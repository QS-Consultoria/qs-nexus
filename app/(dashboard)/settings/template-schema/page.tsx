'use client'

import { useState, useEffect, useMemo } from 'react'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { SchemaFieldEditor } from '@/components/settings/schema-field-editor'
import { SchemaPreview } from '@/components/settings/schema-preview'
import { validateTemplateSchemaConfig } from '@/lib/services/schema-builder'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react'
import { FieldDefinition, TemplateSchemaConfig } from '@/lib/types/template-schema'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    fields: FieldDefinition[]
    isActive: boolean
  }>({
    name: '',
    fields: [],
    isActive: false,
  })

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (formData.fields.length === 0) {
        toast.error('Adicione pelo menos um campo')
        return
      }

      const url = editingId
        ? `/api/template-schema/configs/${editingId}`
        : '/api/template-schema/configs'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar schema')
      }

      toast.success(editingId ? 'Schema atualizado' : 'Schema criado')
      resetForm()
      fetchConfigs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar')
      console.error(error)
    }
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      name: '',
      fields: [],
      isActive: false,
    })
  }

  function handleEdit(config: TemplateSchemaConfig) {
    setEditingId(config.id)
    setFormData({
      name: config.name,
      fields: config.fields,
      isActive: config.isActive,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  function addField() {
    const newField: FieldDefinition = {
      name: '',
      type: 'string',
      required: true,
    }
    setFormData({
      ...formData,
      fields: [...formData.fields, newField],
    })
  }

  function updateField(index: number, field: FieldDefinition) {
    const newFields = [...formData.fields]
    newFields[index] = field
    setFormData({ ...formData, fields: newFields })
  }

  function deleteField(index: number) {
    const newFields = formData.fields.filter((_, i) => i !== index)
    setFormData({ ...formData, fields: newFields })
  }

  const previewConfig: TemplateSchemaConfig | null = formData.name
    ? {
        id: editingId || 'preview',
        name: formData.name,
        fields: formData.fields,
        isActive: formData.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : null

  const activeConfig = configs.find(c => c.isActive)

  const validation = useMemo(() => {
    return validateTemplateSchemaConfig({
      name: formData.name,
      fields: formData.fields,
    })
  }, [formData.name, formData.fields])

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Schema de Template</h2>
          <p className="text-muted-foreground">
            Configure o schema dinâmico de templates com campos personalizáveis
          </p>
        </div>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Schema' : 'Novo Schema'}</CardTitle>
            <CardDescription>
              {editingId
                ? 'Atualize os campos abaixo e salve as alterações'
                : 'Crie um novo schema de template'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="schema-name">Nome do Schema</Label>
                <Input
                  id="schema-name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Schema Padrão"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Campos do Schema</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Campo
                  </Button>
                </div>

                {formData.fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    Nenhum campo adicionado. Clique em "Adicionar Campo" para começar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.fields.map((field, index) => (
                      <SchemaFieldEditor
                        key={index}
                        field={field}
                        onChange={updatedField => updateField(index, updatedField)}
                        onDelete={() => deleteField(index)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={checked =>
                    setFormData({ ...formData, isActive: checked === true })
                  }
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Marcar como schema ativo
                </Label>
              </div>

              {!validation.valid && validation.errors.length > 0 && (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-semibold text-destructive">
                          Erros de validação:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                          {validation.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={!validation.valid}>
                  {editingId ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Schema
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
              {!validation.valid && (
                <p className="text-xs text-muted-foreground">
                  Corrija os erros acima para salvar o schema
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        {previewConfig && formData.fields.length > 0 && (
          <SchemaPreview config={previewConfig} />
        )}

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
              <div className="text-center py-8 text-muted-foreground">
                Nenhum schema criado ainda
              </div>
            ) : (
              <div className="space-y-2">
                {configs.map(config => (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{config.name}</h3>
                        {config.isActive && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {config.fields.length} campo(s) definido(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteDialog(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

