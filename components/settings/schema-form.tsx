'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SchemaFieldEditor } from '@/components/settings/schema-field-editor'
import { SchemaPreview } from '@/components/settings/schema-preview'
import { validateTemplateSchemaConfig } from '@/lib/services/schema-builder'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FieldDefinition, TemplateSchemaConfig } from '@/lib/types/template-schema'
import { Check, X, AlertCircle, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SchemaFormProps {
  config?: TemplateSchemaConfig | null
  onSubmit: (data: { name: string; fields: FieldDefinition[]; isActive: boolean }) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function SchemaForm({ config, onSubmit, onCancel, isLoading = false }: SchemaFormProps) {
  const [formData, setFormData] = useState<{
    name: string
    fields: FieldDefinition[]
    isActive: boolean
  }>({
    name: config?.name || '',
    fields: config?.fields || [],
    isActive: config?.isActive || false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formData.fields.length === 0) {
      return
    }
    await onSubmit(formData)
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
        id: config?.id || 'preview',
        name: formData.name,
        fields: formData.fields,
        isActive: formData.isActive,
        createdAt: config?.createdAt || new Date(),
        updatedAt: config?.updatedAt || new Date(),
      }
    : null

  const validation = validateTemplateSchemaConfig({
    name: formData.name,
    fields: formData.fields,
  })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Tabs defaultValue="fields" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fields">Campos</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="space-y-4 mt-4">
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Campos do Schema</Label>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Campo
                </Button>
              </div>

              {formData.fields.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Nenhum campo adicionado. Clique em "Adicionar Campo" para começar.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={addField}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Campo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {formData.fields.map((field, index) => (
                    <AccordionItem key={index} value={`field-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-medium">
                            {field.name || `Campo ${index + 1} (sem nome)`}
                          </span>
                          <span className="text-xs text-muted-foreground">({field.type})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <SchemaFieldEditor
                          field={field}
                          onChange={updatedField => updateField(index, updatedField)}
                          onDelete={() => deleteField(index)}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            {!validation.valid && validation.errors.length > 0 && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-semibold text-destructive">Erros de validação:</p>
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
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {previewConfig && formData.fields.length > 0 ? (
              <SchemaPreview config={previewConfig} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Adicione campos para ver o preview do schema
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="border-t p-6 flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={!validation.valid || isLoading}>
          <Check className="h-4 w-4 mr-2" />
          {config ? 'Salvar Alterações' : 'Criar Schema'}
        </Button>
      </div>
      {!validation.valid && (
        <div className="px-6 pb-2">
          <p className="text-xs text-muted-foreground">
            Corrija os erros acima para salvar o schema
          </p>
        </div>
      )}
    </form>
  )
}

