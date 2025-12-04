'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DocumentSchemaField {
  fieldName: string
  displayName: string
  fieldType: 'text' | 'numeric' | 'date' | 'boolean'
  isRequired: boolean
  description?: string
}

interface Props {
  onSave: (schema: any) => Promise<void>
  onCancel: () => void
}

export function DocumentSchemaBuilder({ onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [baseType, setBaseType] = useState<'document' | 'sped' | 'csv'>('document')
  const [category, setCategory] = useState<string>('')
  const [tableName, setTableName] = useState('')
  const [fields, setFields] = useState<DocumentSchemaField[]>([])
  const [enableRAG, setEnableRAG] = useState(true)
  const [isDefaultForBaseType, setIsDefaultForBaseType] = useState(false)
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Auto-gerar tableName baseado no name
  const handleNameChange = (value: string) => {
    setName(value)
    // Gerar table name: lowercase, sem acentos, underscore
    const generated = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    setTableName(generated)
  }

  const addField = () => {
    setFields([
      ...fields,
      {
        fieldName: '',
        displayName: '',
        fieldType: 'text',
        isRequired: false,
        description: ''
      }
    ])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<DocumentSchemaField>) => {
    setFields(fields.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    ))
  }

  // Auto-gerar fieldName baseado no displayName
  const handleDisplayNameChange = (index: number, value: string) => {
    const generated = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    
    updateField(index, { 
      displayName: value,
      fieldName: generated 
    })
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(false)

    // Validação básica
    if (!name.trim()) {
      setError('Nome do schema é obrigatório')
      return
    }
    if (!tableName.trim()) {
      setError('Nome da tabela é obrigatório')
      return
    }
    if (fields.length === 0) {
      setError('Adicione pelo menos 1 campo')
      return
    }

    // Validar campos
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      if (!field.displayName.trim()) {
        setError(`Campo ${i + 1}: Nome de exibição é obrigatório`)
        return
      }
      if (!field.fieldName.trim()) {
        setError(`Campo ${i + 1}: Nome do campo é obrigatório`)
        return
      }
    }

    setSaving(true)

    try {
      await onSave({
        name,
        description,
        baseType,
        category: category || null,
        tableName,
        fields,
        enableRAG,
        isDefaultForBaseType,
        aiModelProvider: 'openai',
        aiModelName: 'gpt-4',
        aiTemperature: 0.1,
      })

      setSuccess(true)
      setTimeout(() => {
        onCancel() // Fecha o formulário após sucesso
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Erro ao criar schema')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Schema criado com sucesso! Tabela SQL foi criada.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Defina o nome e tipo do schema de documento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Schema *</Label>
            <Input
              id="name"
              placeholder="Ex: Contratos de Prestação de Serviços"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição detalhada deste tipo de documento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="baseType">Tipo Base *</Label>
              <Select value={baseType} onValueChange={(v: any) => setBaseType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">📄 Documentos (PDF/DOCX/TXT)</SelectItem>
                  <SelectItem value="sped">📊 SPED (Arquivos Contábeis)</SelectItem>
                  <SelectItem value="csv">📋 CSV (Planilhas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="juridico">Jurídico</SelectItem>
                  <SelectItem value="contabil">Contábil</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="tableName">Nome da Tabela SQL *</Label>
            <Input
              id="tableName"
              placeholder="contratos_prestacao"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Apenas letras minúsculas, números e underscore. Será criada como: <code className="font-mono bg-gray-100 px-1 rounded">{tableName || 'nome_tabela'}</code>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableRAG}
                onChange={(e) => setEnableRAG(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Habilitar busca semântica (RAG)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefaultForBaseType}
                onChange={(e) => setIsDefaultForBaseType(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Schema padrão para este tipo</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos do Schema</CardTitle>
          <CardDescription>
            Defina quais campos serão extraídos dos documentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Campo {index + 1}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome de Exibição *</Label>
                  <Input
                    placeholder="Ex: Contratante"
                    value={field.displayName}
                    onChange={(e) => handleDisplayNameChange(index, e.target.value)}
                  />
                </div>

                <div>
                  <Label>Nome do Campo (SQL) *</Label>
                  <Input
                    placeholder="contratante"
                    value={field.fieldName}
                    onChange={(e) => updateField(index, { fieldName: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Dado</Label>
                  <Select 
                    value={field.fieldType} 
                    onValueChange={(v: any) => updateField(index, { fieldType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="numeric">Número</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="boolean">Booleano (Sim/Não)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.isRequired}
                      onChange={(e) => updateField(index, { isRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Campo obrigatório</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>Descrição/Dica para IA</Label>
                <Input
                  placeholder="Ex: Razão social da empresa contratante"
                  value={field.description || ''}
                  onChange={(e) => updateField(index, { description: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addField}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Campo
          </Button>

          {fields.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum campo adicionado. Clique em "Adicionar Campo" para começar.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || fields.length === 0}
        >
          {saving ? 'Criando...' : 'Criar Schema'}
        </Button>
      </div>
    </div>
  )
}

