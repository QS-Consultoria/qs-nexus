import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Scale, ArrowRight, Sparkles, Shield, Zap, FileText } from 'lucide-react'

export default async function Home() {
  const session = await auth()

  // Se já está autenticado, redireciona para o dashboard
  if (session) {
    redirect('/dashboard')
  }

  // Se não está autenticado, mostra landing page moderna
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-900/[0.02] bg-[size:20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="p-4 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                <Scale className="h-10 w-10 text-primary-foreground" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-foreground">
                LegalWise
              </h1>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              RAG Dashboard
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Sistema inteligente de gerenciamento de documentos jurídicos com busca semântica e
              análise avançada
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg shadow-xl hover:shadow-2xl transition-all duration-200"
                >
                  Começar agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg border-2 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Fazer login
                </Button>
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 border border-border">
                <div className="p-3 bg-primary rounded-xl w-fit mb-4">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">IA Avançada</h3>
                <p className="text-muted-foreground">
                  Busca semântica e análise inteligente de documentos jurídicos
                </p>
              </div>

              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 border border-border">
                <div className="p-3 bg-primary/90 rounded-xl w-fit mb-4">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Seguro</h3>
                <p className="text-muted-foreground">
                  Autenticação robusta e proteção de dados sensíveis
                </p>
              </div>

              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 border border-border">
                <div className="p-3 bg-primary/80 rounded-xl w-fit mb-4">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Rápido</h3>
                <p className="text-muted-foreground">
                  Processamento eficiente e interface responsiva
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">LegalWise RAG Dashboard</p>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} LegalWise. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
