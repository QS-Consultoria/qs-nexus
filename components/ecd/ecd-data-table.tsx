'use client'

/**
 * Tabela de Dados ECD (BP ou DRE)
 * 
 * Exibe contas com saldos, AH e AV
 * Enriquecida com Plano Referencial Oficial da RFB
 */

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ECDDataTableProps {
  data: any[]
  anos: number[]
  tipo: 'BP' | 'DRE'
  showAV?: boolean
  showAH?: boolean
}

export function ECDDataTable({ data, anos, tipo, showAV = true, showAH = true }: ECDDataTableProps) {
  // Ordenar dados por código referencial
  const sortedData = [...data].sort((a, b) => {
    const refA = a.codCtaRef || ''
    const refB = b.codCtaRef || ''
    return refA.localeCompare(refB)
  })

  // Identificar tipo de conta baseado no código referencial
  const getAccountType = (codCtaRef: string): string => {
    if (!codCtaRef) return 'indefinido'
    const firstChar = codCtaRef.charAt(0)
    
    if (firstChar === '1') return 'ativo'
    if (firstChar === '2') {
      // Patrimônio Líquido geralmente começa com 2.03 ou 2.04
      if (codCtaRef.startsWith('2.03') || codCtaRef.startsWith('2.04')) {
        return 'patrimonio-liquido'
      }
      return 'passivo'
    }
    if (firstChar === '3') return 'resultado' // DRE
    
    return 'indefinido'
  }

  // Obter nível e tipo da conta OFICIAL (do plano referencial RFB)
  const getNivelETipo = (conta: any): { nivel: number; tipo: string; isOficial: boolean; accountType: string } => {
    const codCtaRef = conta.codCtaRef || ''
    const accountType = getAccountType(codCtaRef)
    
    // Prioridade 1: Usar dados oficiais do plano referencial da RFB
    if (conta.nivelOficial && conta.tipoContaOficial) {
      return {
        nivel: conta.nivelOficial,
        tipo: conta.tipoContaOficial,
        isOficial: true,
        accountType
      }
    }
    
    // Prioridade 2: Inferir pela profundidade do código (fallback para contas personalizadas)
    const profundidade = (codCtaRef.match(/\./g) || []).length + 1
    
    if (profundidade === 1) return { nivel: 1, tipo: 'sintética', isOficial: false, accountType }
    if (profundidade === 2) return { nivel: 2, tipo: 'agregadora', isOficial: false, accountType }
    if (profundidade === 3) return { nivel: 3, tipo: 'intermediária', isOficial: false, accountType }
    if (profundidade === 4) return { nivel: 4, tipo: 'subgrupo', isOficial: false, accountType }
    
    return { nivel: 5, tipo: 'analítica', isOficial: false, accountType }
  }
  
  // Nome amigável do tipo de conta
  const getAccountTypeLabel = (accountType: string): string => {
    const labels: Record<string, string> = {
      'ativo': 'ATIVO',
      'passivo': 'PASSIVO',
      'patrimonio-liquido': 'PATRIMÔNIO LÍQUIDO',
      'resultado': 'RESULTADO',
      'indefinido': ''
    }
    return labels[accountType] || ''
  }

  // Cor de fundo baseada no TIPO DE CONTA (Ativo/Passivo/PL/Resultado) e nível
  const getRowStyle = (tipo: string, nivel: number, accountType: string) => {
    // Cores base por tipo de conta
    const baseColors: Record<string, { light: string; border: string; text: string }> = {
      'ativo': {
        light: 'blue',
        border: 'border-blue',
        text: 'text-blue'
      },
      'passivo': {
        light: 'orange',
        border: 'border-orange',
        text: 'text-orange'
      },
      'patrimonio-liquido': {
        light: 'green',
        border: 'border-green',
        text: 'text-green'
      },
      'resultado': {
        light: 'purple',
        border: 'border-purple',
        text: 'text-purple'
      },
      'indefinido': {
        light: 'gray',
        border: 'border-gray',
        text: 'text-gray'
      }
    }
    
    const color = baseColors[accountType] || baseColors['indefinido']
    
    // Intensidade baseada no nível
    const styles: Record<string, any> = {
      'sintética': {
        bg: `bg-gradient-to-r from-${color.light}-100 via-${color.light}-50/80 to-transparent`,
        border: `border-l-4 ${color.border}-600`,
        text: `font-bold ${color.text}-900`
      },
      'agregadora': {
        bg: `bg-gradient-to-r from-${color.light}-50/70 via-${color.light}-50/40 to-transparent`,
        border: `border-l-3 ${color.border}-500`,
        text: `font-semibold ${color.text}-800`
      },
      'intermediária': {
        bg: `bg-gradient-to-r from-${color.light}-50/50 via-${color.light}-50/20 to-transparent`,
        border: `border-l-2 ${color.border}-400`,
        text: `font-medium ${color.text}-700`
      },
      'subgrupo': {
        bg: `bg-gradient-to-r from-${color.light}-50/30 to-transparent`,
        border: `border-l ${color.border}-300`,
        text: `${color.text}-700`
      },
      'analítica': {
        bg: `bg-${color.light}-50/10`,
        border: '',
        text: `${color.text}-600`
      }
    }
    
    return styles[tipo] || styles['analítica']
  }

  // Formatar número como moeda
  const formatCurrency = (value: number) => {
    if (value === 0) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Formatar percentual
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value)
  }

  // Ícone de tendência
  const getTrendIcon = (value: number) => {
    if (value > 0.01) return <TrendingUp className="h-3 w-3 text-green-600" />
    if (value < -0.01) return <TrendingDown className="h-3 w-3 text-red-600" />
    return <Minus className="h-3 w-3 text-gray-400" />
  }

  // Cor do texto baseado no valor
  const getValueColor = (value: number) => {
    if (value > 0.01) return 'text-green-600'
    if (value < -0.01) return 'text-red-600'
    return 'text-muted-foreground'
  }
  
  // Cor da barra de variação
  const getBarColor = (value: number) => {
    if (value > 0.01) return 'bg-green-500'
    if (value < -0.01) return 'bg-red-500'
    return 'bg-gray-300'
  }
  
  // Verificar se valor é zero
  const isZero = (value: number) => Math.abs(value) < 0.01
  
  // Componente de barra de variação
  const VariationBar = ({ value, maxValue = 1 }: { value: number; maxValue?: number }) => {
    const width = Math.min(Math.abs(value / maxValue) * 100, 100)
    const isPositive = value > 0.01
    const isNegative = value < -0.01
    
    return (
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isPositive && 'bg-gradient-to-r from-green-400 to-green-600',
            isNegative && 'bg-gradient-to-r from-red-400 to-red-600',
            !isPositive && !isNegative && 'bg-gray-300'
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">
              Código
            </TableHead>
            <TableHead className="sticky left-[140px] bg-background z-10 min-w-[250px]">
              Descrição
            </TableHead>
            
            {/* Novo padrão: Ano | AV | AH (entrelaçados) */}
            {anos.map((ano, anosIdx) => (
              <React.Fragment key={ano}>
                {/* Coluna do Ano (Saldo) */}
                <TableHead className="text-right min-w-[140px] bg-blue-50/20">
                  <div className="font-semibold">{ano}</div>
                  <div className="text-[10px] text-muted-foreground">Saldo</div>
                </TableHead>
                
                {/* Coluna AV para esse ano */}
                {showAV && (
                  <TableHead className="text-right min-w-[100px] bg-purple-50/30">
                    <div className="text-xs font-medium">AV %</div>
                    <div className="text-[10px] text-muted-foreground">{ano}</div>
                  </TableHead>
                )}
                
                {/* Coluna AH (se não for o primeiro ano) */}
                {showAH && anosIdx > 0 && (
                  <TableHead className="text-right min-w-[110px] bg-amber-50/30">
                    <div className="text-xs font-medium">AH %</div>
                    <div className="text-[10px] text-muted-foreground">{anos[anosIdx - 1]}/{ano}</div>
                  </TableHead>
                )}
              </React.Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3 + anos.length} className="text-center text-muted-foreground">
                Nenhuma conta encontrada
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((conta, idx) => {
              // Obter nível, tipo e classificação da conta
              const { nivel, tipo, isOficial, accountType } = getNivelETipo(conta)
              const styles = getRowStyle(tipo, nivel, accountType)
              const accountTypeLabel = getAccountTypeLabel(accountType)
              
              return (
                <TableRow 
                  key={idx} 
                  className={cn(styles.bg, styles.border, "hover:bg-muted/30 transition-colors")}
                >
                  {/* Código da conta */}
                  <TableCell className={cn("sticky left-0 z-10", styles.bg, styles.border)}>
                    <div className="space-y-0.5">
                      <div className={cn("font-mono text-xs flex items-center gap-1.5", styles.text)}>
                        {conta.codCta}
                        <span className={cn(
                          "inline-flex items-center justify-center w-5 h-5 text-[9px] rounded font-medium",
                          nivel === 1 && "bg-blue-500 text-white",
                          nivel === 2 && "bg-indigo-400 text-white",
                          nivel === 3 && "bg-slate-300 text-slate-700",
                          nivel === 4 && "bg-gray-200 text-gray-600",
                          nivel === 5 && "bg-gray-100 text-gray-500"
                        )}>
                          {nivel}
                        </span>
                        {isOficial && (
                          <span className="inline-flex items-center justify-center px-1 py-0.5 text-[8px] rounded bg-green-100 text-green-700 font-medium">
                            RFB
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                        {conta.codCtaRef}
                        {accountTypeLabel && nivel === 1 && (
                          <span className={cn(
                            "inline-flex items-center justify-center px-1.5 py-0.5 text-[8px] rounded font-bold uppercase",
                            accountType === 'ativo' && "bg-blue-600 text-white",
                            accountType === 'passivo' && "bg-orange-600 text-white",
                            accountType === 'patrimonio-liquido' && "bg-green-600 text-white",
                            accountType === 'resultado' && "bg-purple-600 text-white"
                          )}>
                            {accountTypeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Descrição (priorizar oficial se disponível) */}
                  <TableCell className={cn("sticky left-[140px] z-10 text-sm", styles.bg, styles.text)}>
                    <div>
                      {conta.descricaoOficial || conta.ctaDescricao || '-'}
                      {conta.descricaoOficial && conta.ctaDescricao !== conta.descricaoOficial && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 italic">
                          ({conta.ctaDescricao})
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Novo padrão: Ano | AV | AH (entrelaçados) */}
                  {anos.map((ano, anosIdx) => {
                    const valor = conta.saldos?.[ano] || 0
                    const avPerc = conta.avPerc?.[ano] || 0
                    
                    // Calcular AH com ano anterior (se houver)
                    let ahPerc = 0
                    if (anosIdx > 0) {
                      const anoAnterior = anos[anosIdx - 1]
                      const key = `${anoAnterior}_${ano}_perc`
                      ahPerc = conta.ahPerc?.[key] || 0
                    }
                    
                    return (
                      <React.Fragment key={ano}>
                        {/* Coluna do Saldo */}
                        <TableCell 
                          className={cn(
                            "text-right tabular-nums bg-blue-50/5",
                            isZero(valor) && "text-muted-foreground/50",
                            nivel <= 2 && "font-semibold"
                          )}
                        >
                          {formatCurrency(valor)}
                        </TableCell>
                        
                        {/* Coluna AV */}
                        {showAV && (
                          <TableCell className="text-right bg-purple-50/10">
                            <div className="space-y-0.5">
                              <div className="tabular-nums text-[11px] text-purple-700 font-medium">
                                {formatPercentage(avPerc)}
                              </div>
                              <VariationBar value={avPerc} maxValue={1} />
                            </div>
                          </TableCell>
                        )}
                        
                        {/* Coluna AH (se não for o primeiro ano) */}
                        {showAH && anosIdx > 0 && (
                          <TableCell className="text-right bg-amber-50/10">
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-end gap-0.5">
                                {getTrendIcon(ahPerc)}
                                <span className={cn('tabular-nums text-[11px] font-medium', getValueColor(ahPerc))}>
                                  {formatPercentage(ahPerc)}
                                </span>
                              </div>
                              <VariationBar value={ahPerc} maxValue={2} />
                            </div>
                          </TableCell>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

