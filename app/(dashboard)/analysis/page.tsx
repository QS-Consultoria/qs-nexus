import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, TrendingUp, PieChart, Activity } from 'lucide-react'

export const metadata = {
  title: 'Análises | QS Nexus',
  description: 'Análises e insights de dados',
}

export default function AnalysisPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Análises</h1>
        <p className="text-muted-foreground">
          Insights e análises inteligentes dos seus dados
        </p>
      </div>

      {/* Em Desenvolvimento */}
      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
          <CardDescription>
            Esta funcionalidade está sendo construída
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <BarChart className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Análise de Documentos</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Tendências</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <PieChart className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Distribuição</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Atividades</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

