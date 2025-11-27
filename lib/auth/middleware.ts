import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { db } from '@/lib/db'
import { users, organizationMemberships } from '@/lib/db/schema/organizations'
import { eq } from 'drizzle-orm'
import {
  UserContext,
  Permission,
  checkUserPermission,
  mergePermissions,
  GlobalRole,
  OrgRole,
} from './permissions'

/**
 * Middleware de Autenticação e Autorização
 * Para proteger rotas de API e páginas
 */

/**
 * Obtém contexto completo do usuário autenticado
 */
export async function getUserContext(req: NextRequest): Promise<UserContext | null> {
  try {
    // Obter sessão (NextAuth)
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return null
    }

    // Buscar usuário no banco
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user || !user.isActive) {
      return null
    }

    // Buscar membership na org padrão (se tiver)
    let orgRole: OrgRole | null = null
    let organizationId: string | null = user.defaultOrgId

    if (user.defaultOrgId) {
      const [membership] = await db
        .select()
        .from(organizationMemberships)
        .where(
          eq(organizationMemberships.userId, user.id),
          eq(organizationMemberships.organizationId, user.defaultOrgId)
        )
        .limit(1)

      if (membership && membership.isActive) {
        orgRole = membership.role
      }
    }

    // Mesclar permissões de global role + org role
    const permissions = mergePermissions(
      user.globalRole as GlobalRole,
      orgRole
    )

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      globalRole: user.globalRole as GlobalRole,
      organizationId,
      orgRole,
      permissions,
    }
  } catch (error) {
    console.error('[Auth] Erro ao obter contexto do usuário:', error)
    return null
  }
}

/**
 * Middleware: Requer autenticação
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: UserContext } | NextResponse> {
  const user = await getUserContext(req)

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  return { user }
}

/**
 * Middleware: Requer permissão específica
 */
export async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<{ user: UserContext } | NextResponse> {
  const authResult = await requireAuth(req)

  if (authResult instanceof NextResponse) {
    return authResult // Retorna erro 401
  }

  const { user } = authResult

  if (!checkUserPermission(user, permission)) {
    return NextResponse.json(
      { error: 'Permissão insuficiente' },
      { status: 403 }
    )
  }

  return { user }
}

/**
 * Middleware: Requer role específico
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: (GlobalRole | OrgRole)[]
): Promise<{ user: UserContext } | NextResponse> {
  const authResult = await requireAuth(req)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  const hasRole =
    allowedRoles.includes(user.globalRole) ||
    (user.orgRole && allowedRoles.includes(user.orgRole))

  if (!hasRole) {
    return NextResponse.json(
      { error: 'Role insuficiente' },
      { status: 403 }
    )
  }

  return { user }
}

/**
 * Middleware: Requer acesso à organização específica
 */
export async function requireOrganizationAccess(
  req: NextRequest,
  organizationId: string
): Promise<{ user: UserContext } | NextResponse> {
  const authResult = await requireAuth(req)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  // Super admin tem acesso a tudo
  if (user.globalRole === 'super_admin') {
    return { user }
  }

  // Verifica se usuário tem membership na org
  const [membership] = await db
    .select()
    .from(organizationMemberships)
    .where(
      eq(organizationMemberships.userId, user.id),
      eq(organizationMemberships.organizationId, organizationId)
    )
    .limit(1)

  if (!membership || !membership.isActive) {
    return NextResponse.json(
      { error: 'Acesso negado a esta organização' },
      { status: 403 }
    )
  }

  return { user }
}

/**
 * Helper: Extrai organizationId de diferentes fontes
 */
export function extractOrganizationId(req: NextRequest): string | null {
  // Tentar obter de query params
  const { searchParams } = new URL(req.url)
  let orgId = searchParams.get('organizationId')

  if (orgId) return orgId

  // Tentar obter de headers
  orgId = req.headers.get('x-organization-id')

  return orgId
}

/**
 * Wrapper para rotas de API protegidas
 */
export function withAuth(
  handler: (req: NextRequest, user: UserContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await requireAuth(req)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    return handler(req, authResult.user)
  }
}

/**
 * Wrapper para rotas que requerem permissão
 */
export function withPermission(
  permission: Permission,
  handler: (req: NextRequest, user: UserContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await requirePermission(req, permission)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    return handler(req, authResult.user)
  }
}

