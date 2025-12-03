import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { organizationMembers, organizations } from '@/lib/db/schema/organizations'
import { eq, and } from 'drizzle-orm'
import { hasPermission } from '@/lib/auth/permissions'
import type { OrgRole } from '@/lib/auth/permissions'

/**
 * GET /api/users/[id]/organizations
 * Lista organizações do usuário
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: organizationMembers.role,
        isActive: organizationMembers.isActive,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, params.id))

    return NextResponse.json({ organizations: orgs })
  } catch (error) {
    console.error('Error fetching user organizations:', error)
    return NextResponse.json({ error: 'Erro ao buscar organizações' }, { status: 500 })
  }
}

/**
 * POST /api/users/[id]/organizations
 * Adiciona usuário a uma organização
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão
    if (!hasPermission(session.user.globalRole || 'viewer', 'users.manage')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { organizationId, role } = body

    if (!organizationId || !role) {
      return NextResponse.json({ error: 'organizationId e role são obrigatórios' }, { status: 400 })
    }

    // Verificar se membership já existe
    const [existing] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, params.id),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json({ error: 'Usuário já pertence a esta organização' }, { status: 409 })
    }

    // Criar membership
    const [membership] = await db
      .insert(organizationMembers)
      .values({
        userId: params.id,
        organizationId,
        role: role as any,
        invitedBy: session.user.id,
        invitedAt: new Date(),
        isActive: true,
      })
      .returning()

    return NextResponse.json({
      message: 'Usuário adicionado à organização',
      membership,
    })
  } catch (error) {
    console.error('Error adding user to organization:', error)
    return NextResponse.json({ error: 'Erro ao adicionar usuário à organização' }, { status: 500 })
  }
}
