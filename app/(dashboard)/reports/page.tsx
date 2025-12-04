import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileCheck, FileText, Download, Calendar } from 'lucide-react'

export const metadata = {
  title: 'Relatórios | QS Nexus',
  description: 'Relatórios e exportações',
}

export default function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Gere relatórios personalizados dos seus dados
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
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Relatório de Documentos</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <FileCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Relatório SPED</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <Download className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Exportações</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Relatórios Agendados</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

