'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DocumentSchemaBuilder } from '@/components/admin/document-schema-builder'
import { Plus, FileText, Database, Table, Settings, Trash2, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DocumentSchema {
  id: string
  name: string
  description?: string
  baseType: 'document' | 'sped' | 'csv'
  category?: string
  tableName: string
  fields: any[]
  enableRAG: boolean
  isActive: boolean
  isDefaultForBaseType: boolean
  sqlTableCreated: boolean
  documentsProcessed: number
  createdAt: string
}

export default function DocumentSchemasPage() {
  const [schemas, setSchemas] = useState<DocumentSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadSchemas()
  }, [])

  const loadSchemas = async () => {
    try {
      const res = await fetch('/api/admin/document-schemas')
      if (!res.ok) throw new Error('Erro ao carregar schemas')
      
      const data = await res.json()
      setSchemas(data.schemas || [])
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSchema = async (schemaData: any) => {
    try {
      const res = await fetch('/api/admin/document-schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemaData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar schema')
      }

      const data = await res.json()
      
      toast({
        title: 'Sucesso!',
        description: `Schema "${schemaData.name}" criado. Tabela "${data.tableName}" foi criada no banco.`
      })

      setShowBuilder(false)
      loadSchemas()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar schema',
        description: error.message
      })
      throw error
    }
  }

  const handleDeactivate = async (schemaId: string) => {
    if (!confirm('Desativar este schema? Ele não aparecerá mais como opção de upload.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/document-schemas/${schemaId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Erro ao desativar')

      toast({
        title: 'Schema desativado',
        description: 'O schema foi desativado com sucesso'
      })

      loadSchemas()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message
      })
    }
  }

  const getBaseTypeIcon = (baseType: string) => {
    switch (baseType) {
      case 'document': return <FileText className="h-5 w-5" />
      case 'sped': return <Database className="h-5 w-5" />
      case 'csv': return <Table className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  const getBaseTypeLabel = (baseType: string) => {
    switch (baseType) {
      case 'document': return 'Documentos'
      case 'sped': return 'SPED'
      case 'csv': return 'CSV'
      default: return baseType
    }
  }

  const getCategoryBadge = (category?: string) => {
    if (!category) return null
    
    const colors = {
      juridico: 'bg-blue-100 text-blue-800',
      contabil: 'bg-green-100 text-green-800',
      geral: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge className={colors[category as keyof typeof colors] || 'bg-gray-100'}>
        {category}
      </Badge>
    )
  }

  if (showBuilder) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Criar Novo Schema de Documento</h1>
            <p className="text-gray-600 mt-2">
              Defina a estrutura de dados que será extraída deste tipo de documento
            </p>
          </div>

          <DocumentSchemaBuilder
            onSave={handleCreateSchema}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Schemas de Documentos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie as estruturas de dados dos seus documentos
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Schema
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando schemas...</p>
        </div>
      ) : schemas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum schema criado</h3>
            <p className="text-gray-600 mb-4">
              Crie seu primeiro schema para começar a processar documentos
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Schema
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Agrupar por baseType */}
          {['document', 'sped', 'csv'].map(baseType => {
            const typeSchemas = schemas.filter(s => s.baseType === baseType)
            if (typeSchemas.length === 0) return null

            return (
              <div key={baseType}>
                <div className="flex items-center gap-2 mb-3">
                  {getBaseTypeIcon(baseType)}
                  <h2 className="text-xl font-semibold">
                    {getBaseTypeLabel(baseType)} ({typeSchemas.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {typeSchemas.map(schema => (
                    <Card key={schema.id} className={!schema.isActive ? 'opacity-60' : ''}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{schema.name}</CardTitle>
                              {schema.isDefaultForBaseType && (
                                <Badge variant="outline">Padrão</Badge>
                              )}
                            </div>
                            {schema.category && (
                              <div className="mt-2">
                                {getCategoryBadge(schema.category)}
                              </div>
                            )}
                          </div>
                          {!schema.isActive && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                        {schema.description && (
                          <CardDescription className="mt-2">
                            {schema.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <p className="text-gray-600 mb-2">
                            <strong>Tabela SQL:</strong>{' '}
                            <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">
                              {schema.tableName}
                            </code>
                          </p>
                          <p className="text-gray-600">
                            <strong>Campos:</strong> {schema.fields.length}
                          </p>
                          <p className="text-gray-600">
                            <strong>Documentos processados:</strong> {schema.documentsProcessed || 0}
                          </p>
                          {schema.enableRAG && (
                            <Badge variant="outline" className="mt-2">
                              RAG Habilitado
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              toast({
                                title: 'Preview',
                                description: `Campos: ${schema.fields.map((f: any) => f.displayName).join(', ')}`
                              })
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Campos
                          </Button>
                          {schema.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(schema.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

