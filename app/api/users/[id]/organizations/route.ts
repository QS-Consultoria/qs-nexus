import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { organizations, organizationMembers } from '@/lib/db/schema/organizations'
import { eq, and } from 'drizzle-orm'
import { addToOrgSchema } from '@/lib/schemas/user-schemas'
import { canManageUser } from '@/lib/services/user-service'

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

    const userOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: organizationMembers.role,
        isActive: organizationMembers.isActive,
        membershipId: organizationMembers.id,
        joinedAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, params.id))

    return NextResponse.json({ organizations: userOrgs })
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

    const body = await request.json()
    const data = addToOrgSchema.parse(body)

    // Verificar se pode adicionar usuário (deve ser admin da org ou super_admin)
    const canAdd = await canManageUser(session.user.id, params.id, data.organizationId)
    
    if (!canAdd) {
      return NextResponse.json(
        { error: 'Você não pode adicionar usuários a esta organização' },
        { status: 403 }
      )
    }

    // Verificar se já não é membro
    const [existing] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, params.id),
          eq(organizationMembers.organizationId, data.organizationId)
        )
      )
      .limit(1)

    if (existing) {
      // Se existe mas está inativo, reativar
      if (!existing.isActive) {
        await db
          .update(organizationMembers)
          .set({
            isActive: true,
            role: data.role,
            updatedAt: new Date(),
          })
          .where(eq(organizationMembers.id, existing.id))

        return NextResponse.json({
          message: 'Usuário reativado na organização',
          membershipId: existing.id,
        })
      }

      return NextResponse.json(
        { error: 'Usuário já é membro desta organização' },
        { status: 409 }
      )
    }

    // Criar membership
    const [membership] = await db
      .insert(organizationMembers)
      .values({
        organizationId: data.organizationId,
        userId: params.id,
        role: data.role,
        invitedBy: session.user.id,
        invitedAt: new Date(),
        isActive: true,
      })
      .returning()

    return NextResponse.json(
      {
        message: 'Usuário adicionado à organização',
        membershipId: membership.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error adding user to organization:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro ao adicionar usuário' }, { status: 500 })
  }
}

