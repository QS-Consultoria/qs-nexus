'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  HelpCircle,
  Info,
  BookOpen,
  MessageSquare,
  Upload,
  FileText,
  Settings,
  LayoutDashboard,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Ajuda e Informações</h1>
        <p className="text-muted-foreground">
          Encontre informações sobre o sistema e como utilizar todas as funcionalidades
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="quick-guides" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Guias Rápidos</span>
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                O que é o LegalWise RAG
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                O LegalWise RAG é um sistema completo de Retrieval-Augmented Generation (RAG) para
                processar documentos jurídicos. O sistema converte documentos DOCX, DOC e PDF para
                Markdown, classifica-os com metadados estruturados e gera embeddings para uso em um
                agente de IA.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Objetivo do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                O objetivo principal é criar um sistema RAG que sirva como base de conhecimento
                para treinar um agente de IA a gerar documentos jurídicos. Os documentos servem
                como exemplos/templates de como um documento jurídico deve ser estruturado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Arquitetura Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                O sistema foi completamente refatorado de Python para TypeScript/Node.js e utiliza:
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Node.js + TypeScript</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">AI SDK para embeddings e classificação</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Drizzle ORM para banco de dados</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Neon (PostgreSQL + pgvector)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Markdown como formato canônico</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline de Processamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">
                    1
                  </Badge>
                  <div>
                    <p className="font-medium">Processamento de Documentos</p>
                    <p className="text-sm text-muted-foreground">
                      Conversão de DOCX, DOC e PDF para Markdown
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">
                    2
                  </Badge>
                  <div>
                    <p className="font-medium">Filtragem</p>
                    <p className="text-sm text-muted-foreground">
                      Filtra por tamanho (300-25.000 palavras)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">
                    3
                  </Badge>
                  <div>
                    <p className="font-medium">Classificação</p>
                    <p className="text-sm text-muted-foreground">
                      Gera metadados estruturados com IA
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">
                    4
                  </Badge>
                  <div>
                    <p className="font-medium">Chunking</p>
                    <p className="text-sm text-muted-foreground">
                      Divide documentos em chunks inteligentes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">
                    5
                  </Badge>
                  <div>
                    <p className="font-medium">Geração de Embeddings</p>
                    <p className="text-sm text-muted-foreground">
                      Cria embeddings vetoriais para busca semântica
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">
                    6
                  </Badge>
                  <div>
                    <p className="font-medium">Armazenamento</p>
                    <p className="text-sm text-muted-foreground">
                      Armazena no banco com índice HNSW otimizado
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Características Principais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Tracking de Processamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Conversão Markdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Classificação Inteligente</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Chunking Inteligente</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Embeddings Otimizados</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Índice HNSW</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Múltiplos Modelos de Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Preview de Markdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Paralelização Completa</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Dashboard de Estatísticas</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                O dashboard principal fornece uma visão geral completa do sistema RAG com
                estatísticas, gráficos e métricas dos documentos processados.
              </p>
              <Separator />
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-2">Estatísticas Gerais</p>
                  <p className="text-sm text-muted-foreground">
                    Cards mostrando total de documentos, pendentes, processando, concluídos,
                    falhados, rejeitados e progresso geral.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-2">Gráficos</p>
                  <p className="text-sm text-muted-foreground">
                    Visualizações de distribuição por status, área jurídica, modelos, tokens e
                    custos.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-2">Documentos Recentes</p>
                  <p className="text-sm text-muted-foreground">
                    Lista dos últimos 10 arquivos processados com status e informações básicas.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Acessar Dashboard <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Arquivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Faça upload de documentos DOCX, DOC ou PDF para processamento no sistema.
              </p>
              <Separator />
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-2">Como Fazer Upload</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Drag & Drop: Arraste arquivos para a área de upload</li>
                    <li>Seleção: Clique na área ou botão para escolher arquivos</li>
                    <li>Pasta: Selecione uma pasta inteira para upload em lote</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Formatos Suportados</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">.docx</Badge>
                    <Badge variant="secondary">.doc</Badge>
                    <Badge variant="secondary">.pdf</Badge>
                    <Badge variant="secondary">.txt</Badge>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-2">Validações</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Formato: Apenas DOCX, DOC ou PDF</li>
                    <li>Tamanho: Máximo de 50MB por arquivo</li>
                  </ul>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/upload"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Acessar Upload <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Arquivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Visualize e gerencie todos os documentos processados no sistema.
              </p>
              <Separator />
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-2">Lista de Arquivos</p>
                  <p className="text-sm text-muted-foreground">
                    Tabela com todos os documentos mostrando nome, status, área jurídica, tipo e
                    data. Use filtros para encontrar documentos específicos.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-2">Detalhes do Arquivo</p>
                  <p className="text-sm text-muted-foreground">
                    Visualize informações completas, metadados, preview/edit de markdown, chunks e
                    opções de reprocessamento.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-2">Filtros e Paginação</p>
                  <p className="text-sm text-muted-foreground">
                    Filtre por status, área ou tipo. Navegue com paginação de 20 itens por página.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/files"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Acessar Arquivos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat RAG
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Faça perguntas sobre os documentos processados usando busca vetorial e IA.
              </p>
              <Separator />
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-2">Como Usar</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Selecione o modelo de IA no seletor</li>
                    <li>Digite sua pergunta na caixa de texto</li>
                    <li>Pressione Enter ou clique em enviar</li>
                    <li>A resposta será gerada em tempo real (streaming)</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium mb-2">Modelos Disponíveis</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">OpenAI:</p>
                      <div className="flex gap-2 flex-wrap mt-1">
                        <Badge variant="outline">GPT-4o Mini</Badge>
                        <Badge variant="outline">GPT-4o</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Google Gemini:</p>
                      <div className="flex gap-2 flex-wrap mt-1">
                        <Badge variant="outline">Gemini 2.0 Flash</Badge>
                        <Badge variant="outline">Gemini 2.5 Flash</Badge>
                        <Badge variant="outline">Gemini 2.0 Flash Lite</Badge>
                        <Badge variant="outline">Gemini 2.5 Flash Lite</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-2">Funcionamento</p>
                  <p className="text-sm text-muted-foreground">
                    O chat usa busca vetorial para encontrar chunks similares aos documentos e
                    gera respostas baseadas apenas no contexto encontrado.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/chat"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Acessar Chat <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Configure a classificação de documentos e o schema dinâmico de templates.
              </p>
              <Separator />
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-2">Configuração de Classificação</p>
                  <p className="text-sm text-muted-foreground">
                    Configure o provider, modelo, system prompt, função de extração e limites de
                    tokens para classificação de documentos.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-2">Schema de Template</p>
                  <p className="text-sm text-muted-foreground">
                    Defina campos configuráveis para templates com tipos Zod (string, number,
                    boolean, enum, array, object, union, etc.).
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-2">Preview em Tempo Real</p>
                  <p className="text-sm text-muted-foreground">
                    Visualize o schema Zod gerado e o prompt do schema antes de salvar.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/settings"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Acessar Settings <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="auth-1">
              <AccordionTrigger>Como faço para me registrar no sistema?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Acesse a página de registro em /register</li>
                  <li>Preencha o formulário com email, senha e nome</li>
                  <li>Clique em "Registrar"</li>
                  <li>Você será redirecionado para a página de login</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Nota:</strong> O email deve ser único no sistema.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="auth-2">
              <AccordionTrigger>O que fazer se receber erro "Email já existe"?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Este erro significa que o email já está cadastrado no sistema. Use outro email
                  ou faça login se já tiver conta.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="auth-3">
              <AccordionTrigger>Como fazer logout?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Clique no botão de usuário no canto superior direito do navbar</li>
                  <li>Selecione "Sair" ou clique no botão de logout</li>
                  <li>Você será deslogado e redirecionado para a página de login</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="upload-1">
              <AccordionTrigger>Quais formatos de arquivo são suportados?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  O sistema suporta os seguintes formatos:
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">.docx</Badge>
                  <Badge variant="secondary">.doc</Badge>
                  <Badge variant="secondary">.pdf</Badge>
                  <Badge variant="secondary">.txt</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Limite:</strong> Máximo de 50MB por arquivo.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="upload-2">
              <AccordionTrigger>Por que meu arquivo não aparece na lista?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Verifique se o arquivo atende aos critérios:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Formato é .docx, .doc, .pdf ou .txt</li>
                  <li>Tamanho é menor que 50MB</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Arquivos que não atendem aos critérios são ignorados silenciosamente.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="upload-3">
              <AccordionTrigger>Como acompanhar o progresso do upload?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Após clicar em "Processar Arquivos", o sistema exibe um componente de progresso
                  com:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-2">
                  <li>Barra de progresso geral</li>
                  <li>Lista de arquivos com status individual</li>
                  <li>Badges coloridos indicando o status de cada arquivo</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  O progresso é atualizado em tempo real via Server-Sent Events (SSE).
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="chat-1">
              <AccordionTrigger>O chat não está respondendo. O que fazer?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Verifique os seguintes pontos:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Verifique se OPENAI_API_KEY está configurado (para modelos OpenAI)</li>
                  <li>Verifique se GOOGLE_GENERATIVE_AI_API_KEY está configurado (para modelos Gemini)</li>
                  <li>Verifique a conexão com a internet</li>
                  <li>Tente trocar de modelo (pode ser um problema específico do modelo)</li>
                  <li>Veja os logs do servidor para erros</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="chat-2">
              <AccordionTrigger>Por que o chat responde "Não tenho essa informação"?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Isso pode acontecer quando:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Não há documentos relevantes na base de conhecimento</li>
                  <li>A similaridade dos chunks encontrados é menor que 50%</li>
                  <li>Não há documentos processados no sistema</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Dica:</strong> Tente reformular a pergunta com termos diferentes ou mais específicos.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="chat-3">
              <AccordionTrigger>Qual modelo de IA devo usar?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium mb-1">Para uso geral:</p>
                    <p>GPT-4o Mini ou Gemini 2.0 Flash Lite (rápido e econômico)</p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Para tarefas complexas:</p>
                    <p>GPT-4o ou Gemini 2.5 Flash (mais poderoso)</p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Para economia:</p>
                    <p>Gemini 2.0/2.5 Flash Lite (versões mais leves)</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="settings-1">
              <AccordionTrigger>Como configurar a classificação de documentos?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Acesse Settings → Classificação</li>
                  <li>Configure o provider e modelo desejado</li>
                  <li>Defina o system prompt</li>
                  <li>Configure a função de extração (ou use a padrão)</li>
                  <li>Defina os limites de tokens</li>
                  <li>Salve a configuração</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="settings-2">
              <AccordionTrigger>Como criar um schema de template?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Acesse Settings → Template Schema</li>
                  <li>Clique em "Criar Novo Schema"</li>
                  <li>Adicione campos com os tipos desejados (string, number, boolean, enum, etc.)</li>
                  <li>Configure cada campo (obrigatório/opcional, descrição, valores padrão)</li>
                  <li>Use o preview para ver o schema Zod gerado</li>
                  <li>Salve o schema</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="common-1">
              <AccordionTrigger>O dashboard está lento. O que fazer?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  O dashboard atualiza automaticamente a cada 30 segundos. Se estiver lento:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Se houver muitos documentos, pode levar alguns segundos para carregar</li>
                  <li>O cache é atualizado a cada 30 segundos</li>
                  <li>Considere usar filtros para reduzir o número de resultados</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="common-2">
              <AccordionTrigger>Como editar o markdown de um documento?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Acesse a lista de arquivos</li>
                  <li>Clique em um arquivo para ver seus detalhes</li>
                  <li>Na seção de markdown, clique em "Editar"</li>
                  <li>Faça suas alterações</li>
                  <li>Clique em "Salvar" para salvar as alterações</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  Você pode alternar entre preview renderizado e código markdown bruto.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="common-3">
              <AccordionTrigger>Como reprocessar um documento?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium mb-1">Reprocessamento Completo:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Acesse os detalhes do arquivo</li>
                      <li>Clique em "Reprocessar Documento"</li>
                      <li>Faça upload de um novo arquivo</li>
                      <li>O documento será completamente reprocessado</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Regeneração de Chunks:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Acesse os detalhes do arquivo</li>
                      <li>Clique em "Regenerar Chunks"</li>
                      <li>Chunks e embeddings serão regenerados sem reprocessar o documento</li>
                    </ol>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Guias Rápidos */}
        <TabsContent value="quick-guides" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Primeiro Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                <li>
                  Acesse a página de <Link href="/upload" className="text-primary hover:underline">Upload</Link>
                </li>
                <li>Arraste arquivos DOCX, DOC ou PDF para a área de upload ou clique para selecionar</li>
                <li>Verifique os arquivos na lista de preview</li>
                <li>Clique em "Processar Arquivos"</li>
                <li>Acompanhe o progresso na tela</li>
                <li>Após o processamento, os arquivos aparecerão na lista de arquivos</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Primeira Pergunta no Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                <li>
                  Acesse a página de <Link href="/chat" className="text-primary hover:underline">Chat</Link>
                </li>
                <li>Selecione o modelo de IA no seletor no topo (recomendado: GPT-4o Mini para começar)</li>
                <li>Digite sua pergunta na caixa de texto na parte inferior</li>
                <li>Pressione Enter ou clique no botão de enviar</li>
                <li>Aguarde a resposta ser gerada em tempo real</li>
                <li>Continue a conversa fazendo mais perguntas se necessário</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Dica:</strong> Seja específico e use termos jurídicos para melhores resultados.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar Classificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                <li>
                  Acesse <Link href="/settings" className="text-primary hover:underline">Settings → Classificação</Link>
                </li>
                <li>Clique em "Criar Nova Configuração" ou edite uma existente</li>
                <li>Selecione o provider (OpenAI ou Google)</li>
                <li>Escolha o modelo desejado (veja limites de tokens)</li>
                <li>Configure o system prompt (ou use o padrão)</li>
                <li>Defina a função de extração (ou use a padrão)</li>
                <li>Configure os limites de tokens se necessário</li>
                <li>Marque como ativa se desejar usar esta configuração</li>
                <li>Salve a configuração</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Editar Markdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                <li>
                  Acesse a <Link href="/files" className="text-primary hover:underline">lista de arquivos</Link>
                </li>
                <li>Clique em um arquivo processado para ver seus detalhes</li>
                <li>Role até a seção "Markdown"</li>
                <li>Clique em "Ver Preview" para ver o markdown renderizado</li>
                <li>Clique em "Ver Código" para ver o código markdown bruto</li>
                <li>Clique em "Editar" para entrar no modo de edição</li>
                <li>Faça suas alterações no editor</li>
                <li>Clique em "Salvar" para salvar as alterações no banco de dados</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Nota:</strong> Alterações no markdown não afetam o arquivo original, apenas o conteúdo processado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Reprocessar Documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2 text-sm">Reprocessamento Completo:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Acesse os detalhes do arquivo que deseja reprocessar</li>
                    <li>Clique no botão "Reprocessar Documento"</li>
                    <li>Faça upload de um novo arquivo (ou use o mesmo)</li>
                    <li>O sistema irá deletar chunks antigos e reprocessar completamente</li>
                    <li>Aguarde o processamento concluir</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Útil para corrigir documentos mal processados ou atualizar versões.
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium mb-2 text-sm">Regeneração de Chunks:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Acesse os detalhes do arquivo</li>
                    <li>Clique no botão "Regenerar Chunks"</li>
                    <li>O sistema irá regenerar chunks e embeddings usando o markdown atual</li>
                    <li>Aguarde a regeneração concluir</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Útil quando o markdown foi editado manualmente ou quando se quer ajustar a estratégia de chunking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

