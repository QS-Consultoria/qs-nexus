import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { organizationMembers } from '@/lib/db/schema/organizations'
import { eq, and, sql } from 'drizzle-orm'
import { updateOrgRoleSchema } from '@/lib/schemas/user-schemas'
import { canManageUser } from '@/lib/services/user-service'

/**
 * PATCH /api/users/[id]/organizations/[orgId]
 * Atualiza role do usuário na organização
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const data = updateOrgRoleSchema.parse(body)

    // Verificar se pode gerenciar
    const canEdit = await canManageUser(session.user.id, params.id, params.orgId)
    
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Você não pode editar este usuário nesta organização' },
        { status: 403 }
      )
    }

    // Atualizar role
    const [updated] = await db
      .update(organizationMembers)
      .set({
        role: data.role,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMembers.userId, params.id),
          eq(organizationMembers.organizationId, params.orgId)
        )
      )
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Membership não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Role atualizado com sucesso',
      membership: updated,
    })
  } catch (error: any) {
    console.error('Error updating organization role:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro ao atualizar role' }, { status: 500 })
  }
}

/**
 * DELETE /api/users/[id]/organizations/[orgId]
 * Remove usuário da organização
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se pode gerenciar
    const canRemove = await canManageUser(session.user.id, params.id, params.orgId)
    
    if (!canRemove) {
      return NextResponse.json(
        { error: 'Você não pode remover este usuário desta organização' },
        { status: 403 }
      )
    }

    // Verificar se não é o último admin da org
    const [{ adminCount }] = await db
      .select({ adminCount: sql<number>`count(*)` })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, params.orgId),
          eq(organizationMembers.role, 'admin_fiscal'),
          eq(organizationMembers.isActive, true)
        )
      )

    const [currentMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, params.id),
          eq(organizationMembers.organizationId, params.orgId)
        )
      )
      .limit(1)

    if (currentMember?.role === 'admin_fiscal' && Number(adminCount) === 1) {
      return NextResponse.json(
        { error: 'Não é possível remover o último admin da organização' },
        { status: 400 }
      )
    }

    // Desativar membership (soft delete)
    await db
      .update(organizationMembers)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMembers.userId, params.id),
          eq(organizationMembers.organizationId, params.orgId)
        )
      )

    return NextResponse.json({ message: 'Usuário removido da organização' })
  } catch (error) {
    console.error('Error removing user from organization:', error)
    return NextResponse.json({ error: 'Erro ao remover usuário' }, { status: 500 })
  }
}

