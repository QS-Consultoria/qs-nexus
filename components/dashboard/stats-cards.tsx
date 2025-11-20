'use client'

import { FileText, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardsProps {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  rejected: number
  progress: number
}

export function StatsCards({
  total,
  pending,
  processing,
  completed,
  failed,
  rejected,
  progress,
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Total de Documentos',
      value: total.toLocaleString('pt-BR'),
      icon: FileText,
      description: 'Documentos no sistema',
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trend: null,
    },
    {
      title: 'Concluídos',
      value: completed.toLocaleString('pt-BR'),
      icon: CheckCircle,
      description: `${progress}% processados`,
      iconBg: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: { value: '+11.01%', positive: true },
    },
    {
      title: 'Pendentes',
      value: pending.toLocaleString('pt-BR'),
      icon: Clock,
      description: 'Aguardando processamento',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      trend: null,
    },
    {
      title: 'Em Processamento',
      value: processing.toLocaleString('pt-BR'),
      icon: AlertCircle,
      description: 'Sendo processados agora',
      iconBg: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      trend: null,
    },
    {
      title: 'Falhados',
      value: failed.toLocaleString('pt-BR'),
      icon: XCircle,
      description: 'Erro no processamento',
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      trend: { value: '-9.05%', positive: false },
    },
    {
      title: 'Rejeitados',
      value: rejected.toLocaleString('pt-BR'),
      icon: XCircle,
      description: 'Fora dos critérios',
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      trend: null,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map(stat => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    {stat.trend && (
                      <div
                        className={cn(
                          'flex items-center gap-1 text-xs font-medium',
                          stat.trend.positive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {stat.trend.positive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {stat.trend.value}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className={cn('rounded-lg p-3', stat.iconBg)}>
                  <Icon className={cn('h-5 w-5', stat.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
