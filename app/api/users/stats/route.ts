import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { ragUsers } from '@/lib/db/schema/rag-users'
import { organizationMembers } from '@/lib/db/schema/organizations'
import { eq, and, sql } from 'drizzle-orm'
import { hasPermission } from '@/lib/auth/permissions'

/**
 * GET /api/users/stats
 * Retorna estatísticas de usuários
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão
    if (!hasPermission(session.user.globalRole, 'users.view')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    let whereClause = undefined

    // Se não é super_admin, filtrar pela organização
    if (session.user.globalRole !== 'super_admin' && session.user.organizationId) {
      // Buscar apenas usuários da sua organização
      const orgUserIds = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, session.user.organizationId),
            eq(organizationMembers.isActive, true)
          )
        )

      const userIds = orgUserIds.map(u => u.userId)
      
      if (userIds.length === 0) {
        return NextResponse.json({
          total: 0,
          active: 0,
          inactive: 0,
          byRole: {},
          byOrganization: {},
        })
      }

      whereClause = sql`${ragUsers.id} IN ${userIds}`
    }

    // Total de usuários
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(ragUsers)
      .where(whereClause)

    // Usuários ativos
    const [{ active }] = await db
      .select({ active: sql<number>`count(*)` })
      .from(ragUsers)
      .where(whereClause ? and(whereClause, eq(ragUsers.isActive, true)) : eq(ragUsers.isActive, true))

    // Usuários inativos
    const inactive = Number(total) - Number(active)

    // Por role
    const byRoleResults = await db
      .select({
        role: ragUsers.globalRole,
        count: sql<number>`count(*)`,
      })
      .from(ragUsers)
      .where(whereClause)
      .groupBy(ragUsers.globalRole)

    const byRole = byRoleResults.reduce((acc, { role, count }) => {
      if (role) {
        acc[role] = Number(count)
      }
      return acc
    }, {} as Record<string, number>)

    // Por organização (apenas se super_admin)
    let byOrganization = {}

    if (session.user.globalRole === 'super_admin') {
      const byOrgResults = await db
        .select({
          orgId: organizationMembers.organizationId,
          count: sql<number>`count(DISTINCT ${organizationMembers.userId})`,
        })
        .from(organizationMembers)
        .where(eq(organizationMembers.isActive, true))
        .groupBy(organizationMembers.organizationId)

      byOrganization = byOrgResults.reduce((acc, { orgId, count }) => {
        acc[orgId] = Number(count)
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      total: Number(total),
      active: Number(active),
      inactive,
      byRole,
      byOrganization,
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}

