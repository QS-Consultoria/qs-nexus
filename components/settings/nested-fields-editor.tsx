'use client'

import { useCallback } from 'react'
import { FieldDefinition } from '@/lib/types/template-schema'
import { SchemaFieldEditor } from './schema-field-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

interface NestedFieldsEditorProps {
  fields: FieldDefinition[]
  onChange: (fields: FieldDefinition[]) => void
  level?: number
  maxDepth?: number
  title?: string
  description?: string
}

const MAX_DEPTH = 5

export function NestedFieldsEditor({
  fields,
  onChange,
  level = 0,
  maxDepth = MAX_DEPTH,
  title,
  description,
}: NestedFieldsEditorProps) {

  const addField = useCallback(() => {
    const newField: FieldDefinition = {
      name: '',
      type: 'string',
      required: true,
    }
    onChange([...fields, newField])
  }, [fields, onChange])

  const updateField = useCallback(
    (index: number, field: FieldDefinition) => {
      const newFields = [...fields]
      newFields[index] = field
      onChange(newFields)
    },
    [fields, onChange]
  )

  const deleteField = useCallback(
    (index: number) => {
      const newFields = fields.filter((_, i) => i !== index)
      onChange(newFields)
    },
    [fields, onChange]
  )

  const indentStyle = level > 0 ? { marginLeft: `${level * 1.5}rem` } : {}
  const canNest = level < maxDepth

  return (
    <div className="space-y-4" style={indentStyle}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{title}</h4>
              <Badge variant="secondary" className="text-xs">
                {fields.length} campo{fields.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {fields.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum campo adicionado
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addField}
              disabled={!canNest}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Campo
            </Button>
            {!canNest && (
              <p className="text-xs text-muted-foreground mt-2">
                Profundidade máxima atingida ({maxDepth} níveis)
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="relative">
              {level > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-l-lg -ml-6"
                />
              )}
              <SchemaFieldEditor
                field={field}
                onChange={updatedField => updateField(index, updatedField)}
                onDelete={() => deleteField(index)}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
            disabled={!canNest}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Campo
          </Button>
          {!canNest && (
            <p className="text-xs text-muted-foreground text-center">
              Profundidade máxima atingida ({maxDepth} níveis)
            </p>
          )}
        </div>
      )}
    </div>
  )
}

