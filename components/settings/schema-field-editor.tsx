'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  FieldDefinition,
  FieldType,
  NumberFieldDefinition,
  EnumFieldDefinition,
  LiteralFieldDefinition,
  ArrayFieldDefinition,
  ObjectFieldDefinition,
  UnionFieldDefinition,
} from '@/lib/types/template-schema'
import { FieldTypeSelector } from './field-type-selector'
import { NestedFieldsEditor } from './nested-fields-editor'
import { validateFieldDefinition } from '@/lib/services/schema-builder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, X, AlertCircle } from 'lucide-react'

interface SchemaFieldEditorProps {
  field: FieldDefinition
  onChange: (field: FieldDefinition) => void
  onDelete?: () => void
}

// Type guards
function isNumberField(field: FieldDefinition): field is NumberFieldDefinition {
  return field.type === 'number'
}

function isEnumField(field: FieldDefinition): field is EnumFieldDefinition {
  return field.type === 'enum'
}

function isLiteralField(field: FieldDefinition): field is LiteralFieldDefinition {
  return field.type === 'literal'
}

function isArrayField(field: FieldDefinition): field is ArrayFieldDefinition {
  return field.type === 'array'
}

function isObjectField(field: FieldDefinition): field is ObjectFieldDefinition {
  return field.type === 'object'
}

function isUnionField(field: FieldDefinition): field is UnionFieldDefinition {
  return field.type === 'union'
}

export function SchemaFieldEditor({ field, onChange, onDelete }: SchemaFieldEditorProps) {
  const [localField, setLocalField] = useState<FieldDefinition>(field)

  useEffect(() => {
    setLocalField(field)
  }, [field])

  const validation = useMemo(() => {
    return validateFieldDefinition(localField)
  }, [localField])

  function updateField(updates: Partial<FieldDefinition>) {
    const updated = { ...localField, ...updates }
    setLocalField(updated)
    onChange(updated)
  }

  return (
    <Card className={validation.valid ? '' : 'border-destructive'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <CardTitle className="text-sm">Campo: {localField.name || 'Sem nome'}</CardTitle>
            {!validation.valid && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Inválido
              </Badge>
            )}
          </div>
          {onDelete && (
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!validation.valid && validation.error && (
          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validation.error}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="field-name">Nome do Campo</Label>
          <Input
            id="field-name"
            value={localField.name}
            onChange={e => updateField({ name: e.target.value })}
            placeholder="ex: docType"
            required
          />
        </div>

        <FieldTypeSelector
          value={localField.type}
          onChange={type => {
            // Reset field-specific properties when type changes
            let baseField: FieldDefinition = {
              name: localField.name,
              type,
              description: localField.description,
              required: localField.required,
              defaultValue: localField.defaultValue,
            }

            // Initialize type-specific properties
            if (type === 'enum') {
              baseField = { ...baseField, type: 'enum', enumValues: [] } as EnumFieldDefinition
            } else if (type === 'literal') {
              baseField = { ...baseField, type: 'literal', literalValue: '' } as LiteralFieldDefinition
            } else if (type === 'number') {
              baseField = { ...baseField, type: 'number' } as NumberFieldDefinition
            } else if (type === 'array') {
              baseField = { ...baseField, type: 'array', itemType: 'string' } as ArrayFieldDefinition
            } else if (type === 'object') {
              baseField = { ...baseField, type: 'object', objectFields: [] } as ObjectFieldDefinition
            } else if (type === 'union') {
              baseField = { ...baseField, type: 'union', unionTypes: [] } as UnionFieldDefinition
            }

            updateField(baseField)
          }}
        />

        <div className="space-y-2">
          <Label htmlFor="field-description">Descrição (opcional)</Label>
          <Textarea
            id="field-description"
            value={localField.description || ''}
            onChange={e => updateField({ description: e.target.value || undefined })}
            placeholder="Descrição do campo para documentação"
            rows={2}
          />
        </div>

        {/* Configurações específicas por tipo */}
        {isNumberField(localField) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="field-min">Min (opcional)</Label>
              <Input
                id="field-min"
                type="number"
                value={localField.min || ''}
                onChange={e =>
                  updateField({
                    ...localField,
                    type: 'number',
                    min: e.target.value ? parseFloat(e.target.value) : undefined,
                  } as FieldDefinition)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-max">Max (opcional)</Label>
              <Input
                id="field-max"
                type="number"
                value={localField.max || ''}
                onChange={e =>
                  updateField({
                    ...localField,
                    type: 'number',
                    max: e.target.value ? parseFloat(e.target.value) : undefined,
                  } as FieldDefinition)
                }
              />
            </div>
          </div>
        )}

        {isEnumField(localField) && (
          <div className="space-y-2">
            <Label>Valores do Enum</Label>
            <div className="space-y-2">
              {(localField.enumValues || []).map((value: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={value}
                    onChange={e => {
                      const newValues = [...localField.enumValues]
                      newValues[index] = e.target.value
                      updateField({
                        ...localField,
                        type: 'enum',
                        enumValues: newValues,
                      } as FieldDefinition)
                    }}
                    placeholder="Valor do enum"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newValues = [...localField.enumValues]
                      newValues.splice(index, 1)
                      updateField({
                        ...localField,
                        type: 'enum',
                        enumValues: newValues,
                      } as FieldDefinition)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newValues = [...(localField.enumValues || []), '']
                  updateField({
                    ...localField,
                    type: 'enum',
                    enumValues: newValues,
                  } as FieldDefinition)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Valor
              </Button>
            </div>
          </div>
        )}

        {isLiteralField(localField) && (
          <div className="space-y-2">
            <Label htmlFor="field-literal">Valor Literal</Label>
            <Input
              id="field-literal"
              value={String(localField.literalValue || '')}
              onChange={e => {
                let value: string | number | boolean = e.target.value
                // Tenta converter para número ou boolean
                if (value === 'true') value = true
                else if (value === 'false') value = false
                else if (!isNaN(Number(value)) && value !== '') value = Number(value)
                updateField({
                  ...localField,
                  type: 'literal',
                  literalValue: value,
                } as FieldDefinition)
              }}
              placeholder="Valor literal (string, number ou boolean)"
            />
          </div>
        )}

        {isArrayField(localField) && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-item-type">Tipo do Item</Label>
              <FieldTypeSelector
                value={localField.itemType}
                onChange={itemType => {
                  if (itemType === 'object') {
                    // Initialize itemConfig when selecting object type
                    updateField({
                      ...localField,
                      type: 'array',
                      itemType,
                      itemConfig: {
                        type: 'object',
                        name: 'item',
                        objectFields: [],
                        required: true,
                      },
                    } as FieldDefinition)
                  } else {
                    // Remove itemConfig for non-object types
                    updateField({
                      ...localField,
                      type: 'array',
                      itemType,
                      itemConfig: undefined,
                    } as FieldDefinition)
                  }
                }}
              />
            </div>

            {localField.itemType === 'object' &&
              localField.itemConfig &&
              isObjectField(localField.itemConfig) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Configuração do Item (Objeto)</Label>
                    <NestedFieldsEditor
                      fields={localField.itemConfig.objectFields || []}
                      onChange={objectFields => {
                        updateField({
                          ...localField,
                          type: 'array',
                          itemType: 'object',
                          itemConfig: {
                            ...localField.itemConfig,
                            objectFields,
                          } as ObjectFieldDefinition,
                        } as FieldDefinition)
                      }}
                      level={0}
                      title="Campos do Objeto Item"
                      description="Configure os campos do objeto que será usado como item do array"
                    />
                  </div>
                </>
              )}
          </div>
        )}

        {isObjectField(localField) && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Campos do Objeto</Label>
              <NestedFieldsEditor
                fields={localField.objectFields || []}
                onChange={objectFields => {
                  updateField({
                    ...localField,
                    type: 'object',
                    objectFields,
                  } as FieldDefinition)
                }}
                level={0}
                title="Campos Aninhados"
                description="Configure os campos deste objeto"
              />
            </div>
          </>
        )}

        {isUnionField(localField) && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipos da Union</Label>
              <div className="space-y-2">
                {localField.unionTypes.map((unionType, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                    <Badge variant="outline">{unionType}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newTypes = localField.unionTypes.filter((_, i) => i !== index)
                        const newConfigs = localField.unionConfigs?.filter((_, i) => i !== index)
                        updateField({
                          ...localField,
                          type: 'union',
                          unionTypes: newTypes,
                          unionConfigs: newConfigs,
                        } as FieldDefinition)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <FieldTypeSelector
                    value={localField.unionTypes[0] || 'string'}
                    onChange={newType => {
                      if (!localField.unionTypes.includes(newType)) {
                        updateField({
                          ...localField,
                          type: 'union',
                          unionTypes: [...localField.unionTypes, newType],
                        } as FieldDefinition)
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione um tipo no seletor acima para adicioná-lo à union
                </p>
              </div>
            </div>

            {(localField.unionTypes.some(
              t => ['enum', 'literal', 'object', 'array', 'union'].includes(t)
            ) ||
              localField.unionConfigs) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Configurações Específicas (Opcional)</Label>
                    <Checkbox
                      checked={!!localField.unionConfigs}
                      onCheckedChange={checked => {
                        if (checked) {
                          // Initialize unionConfigs for each type
                          const configs = localField.unionTypes.map(type => {
                            if (type === 'enum') {
                              return {
                                type: 'enum' as const,
                                name: `${type}_config`,
                                enumValues: [],
                                required: true,
                              } as EnumFieldDefinition
                            } else if (type === 'literal') {
                              return {
                                type: 'literal' as const,
                                name: `${type}_config`,
                                literalValue: '',
                                required: true,
                              } as LiteralFieldDefinition
                            } else if (type === 'object') {
                              return {
                                type: 'object' as const,
                                name: `${type}_config`,
                                objectFields: [],
                                required: true,
                              } as ObjectFieldDefinition
                            } else if (type === 'array') {
                              return {
                                type: 'array' as const,
                                name: `${type}_config`,
                                itemType: 'string' as FieldType,
                                required: true,
                              } as ArrayFieldDefinition
                            } else {
                              return {
                                type: type,
                                name: `${type}_config`,
                                required: true,
                              } as FieldDefinition
                            }
                          })
                          updateField({
                            ...localField,
                            type: 'union',
                            unionConfigs: configs,
                          } as FieldDefinition)
                        } else {
                          updateField({
                            ...localField,
                            type: 'union',
                            unionConfigs: undefined,
                          } as FieldDefinition)
                        }
                      }}
                    />
                    <Label className="text-xs text-muted-foreground cursor-pointer">
                      Usar configurações específicas
                    </Label>
                  </div>

                  {localField.unionConfigs && (
                    <div className="space-y-3">
                      {localField.unionTypes.map((unionType, index) => {
                        const config = localField.unionConfigs?.[index]
                        if (!config) return null

                        return (
                          <Card key={index} className="border-dashed">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xs">
                                Configuração para: <Badge variant="outline">{unionType}</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <SchemaFieldEditor
                                field={config}
                                onChange={updatedConfig => {
                                  const newConfigs = [...(localField.unionConfigs || [])]
                                  newConfigs[index] = updatedConfig
                                  updateField({
                                    ...localField,
                                    type: 'union',
                                    unionConfigs: newConfigs,
                                  } as FieldDefinition)
                                }}
                              />
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="field-default">Valor Padrão (opcional)</Label>
          <Input
            id="field-default"
            value={localField.defaultValue !== undefined ? String(localField.defaultValue) : ''}
            onChange={e => {
              let value: any = e.target.value
              if (value === '') {
                updateField({ ...localField, defaultValue: undefined })
                return
              }
              // Tenta converter baseado no tipo
              if (localField.type === 'number') {
                value = parseFloat(value)
              } else if (localField.type === 'boolean') {
                value = value === 'true'
              }
              updateField({ ...localField, defaultValue: value })
            }}
            placeholder="Valor padrão do campo"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="field-required"
            checked={localField.required !== false}
            onCheckedChange={checked => updateField({ ...localField, required: checked === true })}
          />
          <Label htmlFor="field-required" className="cursor-pointer">
            Campo obrigatório
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}

