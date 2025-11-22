'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TemplateSchemaConfig,
  FieldDefinition,
  NumberFieldDefinition,
  EnumFieldDefinition,
  LiteralFieldDefinition,
  ArrayFieldDefinition,
  ObjectFieldDefinition,
  UnionFieldDefinition,
} from '@/lib/types/template-schema'
import { buildZodSchemaFromConfig } from '@/lib/services/schema-builder'
import { useEffect, useState } from 'react'

interface SchemaPreviewProps {
  config: TemplateSchemaConfig | null
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

/**
 * Gera representação textual de um campo recursivamente
 */
function formatFieldDefinition(field: FieldDefinition, indent: number = 0): string {
  const indentStr = '  '.repeat(indent)
  let fieldDef = `${indentStr}${field.name}: `

  switch (field.type) {
    case 'string':
      fieldDef += 'z.string()'
      break
    case 'number':
      fieldDef += 'z.number()'
      if (isNumberField(field)) {
        if (field.min !== undefined) fieldDef += `.min(${field.min})`
        if (field.max !== undefined) fieldDef += `.max(${field.max})`
      }
      break
    case 'boolean':
      fieldDef += 'z.boolean()'
      break
    case 'date':
      fieldDef += 'z.date()'
      break
    case 'bigint':
      fieldDef += 'z.bigint()'
      break
    case 'enum':
      if (isEnumField(field)) {
        fieldDef += `z.enum([${field.enumValues.map((v: string) => `"${v}"`).join(', ')}])`
      }
      break
    case 'literal':
      if (isLiteralField(field)) {
        const val =
          typeof field.literalValue === 'string'
            ? `"${field.literalValue}"`
            : String(field.literalValue)
        fieldDef += `z.literal(${val})`
      }
      break
    case 'array':
      if (isArrayField(field)) {
        if (field.itemType === 'object' && field.itemConfig && isObjectField(field.itemConfig)) {
          // Array de objetos
          const objectFields = field.itemConfig.objectFields
            .map(f => formatFieldDefinition(f, indent + 1))
            .join(',\n')
          fieldDef += `z.array(z.object({\n${objectFields}\n${indentStr}}))`
        } else {
          // Array de primitivos
          const itemType = field.itemType
          if (['string', 'number', 'boolean', 'date', 'bigint'].includes(itemType)) {
            fieldDef += `z.array(z.${itemType}())`
          } else {
            fieldDef += `z.array(z.${itemType}())` // Fallback para outros tipos
          }
        }
      }
      break
    case 'object':
      if (isObjectField(field)) {
        if (field.objectFields.length === 0) {
          fieldDef += 'z.object({})'
        } else {
          const objectFields = field.objectFields
            .map(f => formatFieldDefinition(f, indent + 1))
            .join(',\n')
          fieldDef += `z.object({\n${objectFields}\n${indentStr}})`
        }
      }
      break
    case 'union':
      if (isUnionField(field)) {
        if (field.unionConfigs && field.unionConfigs.length > 0) {
          // Union com configurações específicas
          const unionSchemas = field.unionConfigs
            .map(config => formatFieldDefinition(config, indent + 1))
            .join(',\n')
          fieldDef += `z.union([\n${unionSchemas}\n${indentStr}])`
        } else {
          // Union de tipos primitivos
          const unionTypes = field.unionTypes
            .map(type => {
              if (['string', 'number', 'boolean', 'date', 'bigint'].includes(type)) {
                return `z.${type}()`
              }
              return `z.${type}()`
            })
            .join(', ')
          fieldDef += `z.union([${unionTypes}])`
        }
      }
      break
  }

  if (field.required === false) {
    fieldDef += '.optional()'
  }
  if (field.defaultValue !== undefined) {
    fieldDef += `.default(${JSON.stringify(field.defaultValue)})`
  }
  if (field.description) {
    fieldDef += `.describe("${field.description}")`
  }

  return fieldDef
}

export function SchemaPreview({ config }: SchemaPreviewProps) {
  const [schemaCode, setSchemaCode] = useState<string>('')

  useEffect(() => {
    if (!config || config.fields.length === 0) {
      setSchemaCode('// Nenhum campo definido')
      return
    }

    try {
      const zodSchema = buildZodSchemaFromConfig(config)
      // Gera uma representação textual do schema usando função recursiva
      const fields = config.fields.map(field => formatFieldDefinition(field, 1)).join(',\n')

      setSchemaCode(`z.object({\n${fields}\n})`)
    } catch (error) {
      setSchemaCode(
        `// Erro ao gerar preview: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      )
    }
  }, [config])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Preview do Schema Zod</CardTitle>
        <CardDescription className="text-xs">
          Visualização do schema Zod gerado a partir da configuração
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <pre className="text-xs font-mono bg-muted p-4 rounded overflow-x-auto max-h-96 overflow-y-auto">
          <code>{schemaCode}</code>
        </pre>
      </CardContent>
    </Card>
  )
}

