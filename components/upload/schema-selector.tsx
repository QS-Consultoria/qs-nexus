'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, FileText, Database, Table, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../ui/button'

interface DocumentSchema {
  id: string
  name: string
  description?: string
  baseType: 'document' | 'sped' | 'csv'
  category?: string
  tableName: string
  fields: Array<{
    displayName: string
    fieldType: string
    isRequired: boolean
  }>
  enableRAG: boolean
  isDefaultForBaseType: boolean
  isActive: boolean
}

interface Props {
  fileName: string
  fileContent?: string  // Primeiras linhas do arquivo para auto-detecção
  baseType: 'document' | 'sped' | 'csv'
  onSchemaSelect: (schemaId: string | null) => void
  className?: string
}

type DetectionConfidence = 'high' | 'medium' | 'low'

interface DetectionResult {
  suggestedSchemaId: string | null
  confidence: DetectionConfidence
  reasoning?: string
}

export function SchemaSelector({ 
  fileName, 
  fileContent,
  baseType, 
  onSchemaSelect,
  className 
}: Props) {
  const [schemas, setSchemas] = useState<DocumentSchema[]>([])
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [showAllSchemas, setShowAllSchemas] = useState(false)

  useEffect(() => {
    loadSchemas()
  }, [baseType])

  useEffect(() => {
    if (fileContent && schemas.length > 0 && !detection) {
      detectSchema()
    }
  }, [fileContent, schemas])

  const loadSchemas = async () => {
    try {
      const res = await fetch(`/api/admin/document-schemas?baseType=${baseType}`)
      if (!res.ok) throw new Error('Erro ao carregar schemas')
      
      const data = await res.json()
      const activeSchemas = (data.schemas || []).filter((s: DocumentSchema) => s.isActive)
      setSchemas(activeSchemas)

      // Se há apenas 1 schema, seleciona automaticamente
      if (activeSchemas.length === 1) {
        setSelectedSchemaId(activeSchemas[0].id)
        onSchemaSelect(activeSchemas[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar schemas:', error)
    } finally {
      setLoading(false)
    }
  }

  const detectSchema = async () => {
    if (!fileContent || schemas.length <= 1) return

    setDetecting(true)
    try {
      // TODO: Implementar endpoint de detecção real
      // Por enquanto, usar heurística simples
      
      // Se há um schema padrão, usar ele
      const defaultSchema = schemas.find(s => s.isDefaultForBaseType)
      if (defaultSchema) {
        setDetection({
          suggestedSchemaId: defaultSchema.id,
          confidence: 'high',
          reasoning: 'Schema padrão da organização'
        })
        setSelectedSchemaId(defaultSchema.id)
        onSchemaSelect(defaultSchema.id)
      } else {
        // Usar primeiro schema
        setDetection({
          suggestedSchemaId: schemas[0].id,
          confidence: 'medium',
          reasoning: 'Detectado automaticamente'
        })
        setSelectedSchemaId(schemas[0].id)
        onSchemaSelect(schemas[0].id)
      }
    } catch (error) {
      console.error('Erro na detecção:', error)
    } finally {
      setDetecting(false)
    }
  }

  const handleSchemaChange = (schemaId: string) => {
    setSelectedSchemaId(schemaId)
    onSchemaSelect(schemaId)
  }

  const getConfidenceColor = (confidence: DetectionConfidence) => {
    switch (confidence) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-gray-600'
    }
  }

  const getConfidenceStars = (confidence: DetectionConfidence) => {
    switch (confidence) {
      case 'high': return '⭐⭐⭐'
      case 'medium': return '⭐⭐'
      case 'low': return '⭐'
    }
  }

  const getBaseTypeIcon = (bt: string) => {
    switch (bt) {
      case 'document': return <FileText className="h-4 w-4" />
      case 'sped': return <Database className="h-4 w-4" />
      case 'csv': return <Table className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Carregando schemas...</span>
      </div>
    )
  }

  if (schemas.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-gray-600">
            Nenhum schema ativo encontrado para este tipo de documento.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Entre em contato com o administrador para criar schemas.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Se há apenas 1 schema, exibir mensagem simples
  if (schemas.length === 1) {
    const schema = schemas[0]
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {getBaseTypeIcon(schema.baseType)}
            <CardTitle className="text-base">Schema Selecionado</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900">{schema.name}</h3>
            {schema.description && (
              <p className="text-sm text-blue-700 mt-1">{schema.description}</p>
            )}
            <div className="mt-3 text-sm text-blue-800">
              <strong>Campos que serão extraídos:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {schema.fields.slice(0, 5).map((field, i) => (
                  <li key={i}>
                    {field.displayName}
                    {field.isRequired && <span className="text-red-600">*</span>}
                  </li>
                ))}
                {schema.fields.length > 5 && (
                  <li className="text-blue-600">
                    +{schema.fields.length - 5} campos adicionais
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const suggestedSchema = schemas.find(s => s.id === detection?.suggestedSchemaId)
  const otherSchemas = schemas.filter(s => s.id !== detection?.suggestedSchemaId)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {detecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Detectando schema...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Selecione o Schema do Documento
            </>
          )}
        </CardTitle>
        <CardDescription>
          Arquivo: <strong>{fileName}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schema sugerido */}
        {suggestedSchema && detection && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Sugestão Automática</span>
              </div>
              <Badge className={getConfidenceColor(detection.confidence)}>
                {getConfidenceStars(detection.confidence)}
              </Badge>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="schema"
                checked={selectedSchemaId === suggestedSchema.id}
                onChange={() => handleSchemaChange(suggestedSchema.id)}
                className="mt-1 w-4 h-4"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">{suggestedSchema.name}</h3>
                {suggestedSchema.description && (
                  <p className="text-sm text-blue-700 mt-1">{suggestedSchema.description}</p>
                )}
                {detection.reasoning && (
                  <p className="text-xs text-blue-600 mt-2 italic">
                    💡 {detection.reasoning}
                  </p>
                )}
                <div className="mt-3 text-sm">
                  <strong className="text-blue-900">Campos a extrair:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {suggestedSchema.fields.slice(0, 6).map((field, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {field.displayName}
                      </Badge>
                    ))}
                    {suggestedSchema.fields.length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{suggestedSchema.fields.length - 6}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Outros schemas */}
        {otherSchemas.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllSchemas(!showAllSchemas)}
              className="w-full justify-between"
            >
              <span>Ou escolher outro schema ({otherSchemas.length} disponíveis)</span>
              {showAllSchemas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAllSchemas && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                <RadioGroup value={selectedSchemaId || ''} onValueChange={handleSchemaChange}>
                  {otherSchemas.map(schema => (
                    <div key={schema.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <RadioGroupItem value={schema.id} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {getBaseTypeIcon(schema.baseType)}
                            <span className="font-medium">{schema.name}</span>
                            {schema.isDefaultForBaseType && (
                              <Badge variant="outline" className="text-xs">Padrão</Badge>
                            )}
                          </div>
                          {schema.description && (
                            <p className="text-sm text-gray-600 mt-1">{schema.description}</p>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            {schema.fields.length} campos • Tabela: {schema.tableName}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        {!selectedSchemaId && schemas.length > 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
            ⚠️ Selecione um schema para continuar
          </p>
        )}
      </CardContent>
    </Card>
  )
}

