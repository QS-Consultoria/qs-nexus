'use client'

import { useEffect, useState } from 'react'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { StatusChart } from '@/components/dashboard/status-chart'
import { AreaChart } from '@/components/dashboard/area-chart'
import { RecentFiles } from '@/components/dashboard/recent-files'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardSkeleton } from '@/components/loading-skeletons'
import { toast } from 'react-hot-toast'
import { AlertCircle } from 'lucide-react'

interface StatsData {
  summary: {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    rejected: number
    progress: number
  }
  byArea: Array<{ area: string; count: number }>
  byDocType: Array<{ docType: string; count: number }>
  gold: number
  silver: number
  recentFiles: Array<{
    id: string
    fileName: string
    status: string
    wordsCount: number | null
    processedAt: Date | null
    updatedAt: Date | null
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/documents/stats', {
          next: { revalidate: 30 },
        })

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setStats(data)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido ao carregar estatísticas'
        console.error('Error fetching stats:', error)
        setError(errorMessage)
        toast.error('Erro ao carregar estatísticas. Tente novamente.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Erro ao carregar estatísticas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {error || 'Não foi possível carregar as estatísticas do dashboard.'}
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Recarregar página
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema RAG de documentos jurídicos
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards {...stats.summary} />

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusChart {...stats.summary} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Área Jurídica</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart data={stats.byArea} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos de Qualidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                    <span className="text-xl">🥇</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">GOLD</p>
                    <p className="text-2xl font-bold">{stats.gold}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <span className="text-xl">🥈</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">SILVER</p>
                    <p className="text-2xl font-bold">{stats.silver}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <RecentFiles files={stats.recentFiles} />
      </div>
    </div>
  )
}
