'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Database,
  FileText,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface SpedFile {
  id: string
  fileName: string
  cnpj: string
  companyName: string
  periodStart: string
  periodEnd: string
  status: string
  totalRecords: number
  processedRecords: number
  fileType: string
  createdAt: string
}

interface Account {
  accountCode: string
  accountName: string
  accountLevel: number
  accountType: string
}

interface Entry {
  id: string
  entryDate: string
  entryNumber: string
  description: string | null
  entryAmount: number
}

export default function SpedDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const spedId = params.id as string
  
  const [file, setFile] = useState<SpedFile | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSpedDetails()
  }, [spedId])

  const loadSpedDetails = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Carregar dados do arquivo SPED
      const fileResponse = await fetch(`/api/sped/${spedId}`)
      if (!fileResponse.ok) {
        throw new Error('Arquivo SPED não encontrado')
      }
      const fileData = await fileResponse.json()
      setFile(fileData)

      // Carregar plano de contas
      const accountsResponse = await fetch(`/api/sped/${spedId}/accounts?limit=50`)
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData.accounts || [])
      }

      // Carregar lançamentos
      const entriesResponse = await fetch(`/api/sped/${spedId}/entries?limit=20`)
      if (entriesResponse.ok) {
        const entriesData = await entriesResponse.json()
        setEntries(entriesData.entries || [])
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes')
      toast.error('Erro ao carregar detalhes do SPED')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj || cnpj === '00.000.000/0000-00') return cnpj
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !file) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Arquivo não encontrado</h2>
        <p className="text-muted-foreground">{error || 'O arquivo SPED não existe'}</p>
        <Button asChild>
          <Link href="/sped">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para SPED
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sped">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{file.fileName}</h1>
          <p className="text-muted-foreground">Detalhes do arquivo SPED</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresa</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{file.companyName}</div>
            <p className="text-xs text-muted-foreground font-mono">
              CNPJ: {formatCNPJ(file.cnpj)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Período</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDate(file.periodStart)} - {formatDate(file.periodEnd)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tipo: {file.fileType.toUpperCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processamento</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {file.processedRecords} / {file.totalRecords}
            </div>
            <p className="text-xs text-muted-foreground">
              {file.status === 'completed' ? 'Completo' : 'Em processamento'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com dados */}
      <Tabs defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts">Plano de Contas</TabsTrigger>
          <TabsTrigger value="entries">Lançamentos</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        {/* Plano de Contas */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Plano de Contas</CardTitle>
              <CardDescription>
                Contas contábeis extraídas do arquivo SPED
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conta encontrada
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nome da Conta</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono font-medium">
                            {account.accountCode}
                          </TableCell>
                          <TableCell>{account.accountName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.accountLevel}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{account.accountType}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lançamentos */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Lançamentos Contábeis</CardTitle>
              <CardDescription>
                Últimos lançamentos extraídos do SPED
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(entry.entryDate)}
                          </TableCell>
                          <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={entry.description || '-'}>
                            {entry.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(Number(entry.entryAmount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Informações */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Arquivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome do Arquivo</p>
                  <p className="font-medium">{file.fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo SPED</p>
                  <p className="font-medium">{file.fileType.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-mono font-medium">{formatCNPJ(file.cnpj)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Razão Social</p>
                  <p className="font-medium">{file.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período Inicial</p>
                  <p className="font-medium">{formatDate(file.periodStart)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período Final</p>
                  <p className="font-medium">{formatDate(file.periodEnd)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={file.status === 'completed' ? 'default' : 'secondary'}>
                    {file.status === 'completed' ? 'Processado' : 'Processando'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Importado em</p>
                  <p className="font-medium">{formatDate(file.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Registros</p>
                  <p className="font-medium">{file.totalRecords.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registros Processados</p>
                  <p className="font-medium">{file.processedRecords.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

