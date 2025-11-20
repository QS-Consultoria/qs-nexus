import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware simplificado que verifica apenas o cookie de sessão do NextAuth
 * sem importar o auth config (que depende do database).
 * 
 * Isso evita problemas com Edge Runtime, já que não importa módulos Node.js.
 * 
 * A verificação real de autenticação acontece nas páginas/layouts via server components.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas protegidas
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/files') ||
    pathname.startsWith('/chat')

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Verifica se existe o cookie de sessão do NextAuth
  // O NextAuth usa o nome 'authjs.session-token' ou 'next-auth.session-token'
  const sessionToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  // Se não tem cookie de sessão, redireciona para login
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    // Adiciona a URL de destino para redirecionar após login
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register).*)'],
}
