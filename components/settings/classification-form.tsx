'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ModelSelector } from '@/components/settings/model-selector'
import { CodeEditor } from '@/components/settings/code-editor'
import { SchemaPromptPreview } from '@/components/settings/schema-prompt-preview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, X } from 'lucide-react'

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

interface ClassificationFormProps {
  config?: ClassificationConfig | null
  onSubmit: (data: {
    name: string
    systemPrompt: string
    modelProvider: 'openai' | 'google'
    modelName: string
    maxInputTokens: number
    maxOutputTokens: number
    extractionFunctionCode?: string
    isActive: boolean
  }) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const DEFAULT_EXTRACTION_FUNCTION = `function extractContent(markdown) {
  const lines = markdown.split('\\n');
  const extracted = [];
  
  // Primeiras 3000 caracteres
  let headerContent = '';
  let charCount = 0;
  for (let i = 0; i < lines.length && charCount < 3000; i++) {
    const line = lines[i];
    charCount += line.length + 1;
    headerContent += line + '\\n';
  }
  extracted.push(headerContent.trim());
  
  // Estrutura de seções
  const sectionHeaders = [];
  for (const line of lines) {
    if (line.trim().match(/^#{1,3}\\s+/)) {
      sectionHeaders.push(line.trim());
    }
  }
  extracted.push('\\n## Estrutura:\\n' + sectionHeaders.join('\\n'));
  
  // Últimas 3000 caracteres
  let footerContent = '';
  charCount = 0;
  for (let i = lines.length - 1; i >= 0 && charCount < 3000; i--) {
    const line = lines[i];
    charCount += line.length + 1;
    footerContent = line + '\\n' + footerContent;
  }
  extracted.push(footerContent.trim());
  
  return extracted.join('\\n\\n---\\n\\n');
}`

export function ClassificationForm({
  config,
  onSubmit,
  onCancel,
  isLoading = false,
}: ClassificationFormProps) {
  const [formData, setFormData] = useState({
    name: config?.name || '',
    systemPrompt: config?.systemPrompt || '',
    modelProvider: (config?.modelProvider || 'openai') as 'openai' | 'google',
    modelName: config?.modelName || 'gpt-4o-mini',
    maxInputTokens: config?.maxInputTokens || 128000,
    maxOutputTokens: config?.maxOutputTokens || 16384,
    extractionFunctionCode: config?.extractionFunctionCode || '',
    isActive: config?.isActive || false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="model">Modelo</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="extraction">Extração</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Configuração</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Classificação Padrão"
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
                Marcar como configuração ativa
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="model" className="space-y-4 mt-4">
            <ModelSelector
              provider={formData.modelProvider}
              modelName={formData.modelName}
              onProviderChange={provider => {
                setFormData({
                  ...formData,
                  modelProvider: provider,
                  modelName: provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash',
                })
              }}
              onModelChange={modelName => setFormData({ ...formData, modelName })}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxInputTokens">Max Input Tokens</Label>
                <Input
                  id="maxInputTokens"
                  type="number"
                  value={formData.maxInputTokens}
                  onChange={e =>
                    setFormData({ ...formData, maxInputTokens: parseInt(e.target.value) })
                  }
                  required
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxOutputTokens">Max Output Tokens</Label>
                <Input
                  id="maxOutputTokens"
                  type="number"
                  value={formData.maxOutputTokens}
                  onChange={e =>
                    setFormData({ ...formData, maxOutputTokens: parseInt(e.target.value) })
                  }
                  required
                  min={1}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Instruções para o modelo de IA..."
                rows={8}
                required
              />
              <p className="text-xs text-muted-foreground">
                O prompt do schema será automaticamente adicionado ao final deste prompt durante a
                classificação.
              </p>
            </div>

            <SchemaPromptPreview />
          </TabsContent>

          <TabsContent value="extraction" className="space-y-4 mt-4">
            <CodeEditor
              label="Função de Extração (JavaScript)"
              value={formData.extractionFunctionCode}
              onChange={value => setFormData({ ...formData, extractionFunctionCode: value })}
              placeholder="function extractContent(markdown) { ... }"
              description="Função JavaScript customizada para extrair conteúdo relevante. Deixe vazio para usar a função padrão."
              defaultCode={DEFAULT_EXTRACTION_FUNCTION}
              showDefault={true}
              rows={10}
            />
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
        <Button type="submit" disabled={isLoading}>
          <Check className="h-4 w-4 mr-2" />
          {config ? 'Salvar Alterações' : 'Criar Configuração'}
        </Button>
      </div>
    </form>
  )
}

