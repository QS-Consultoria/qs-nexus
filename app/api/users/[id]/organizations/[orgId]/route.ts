import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { organizationMembers } from '@/lib/db/schema/organizations'
import { eq, and } from 'drizzle-orm'
import { hasPermission } from '@/lib/auth/permissions'
import type { OrgRole } from '@/lib/auth/permissions'

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

    // Verificar permissão
    if (!hasPermission(session.user.globalRole || 'viewer', 'users.manage')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json({ error: 'role é obrigatório' }, { status: 400 })
    }

    // Atualizar membership
    const [updated] = await db
      .update(organizationMembers)
      .set({
        role: role as any,
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
  } catch (error) {
    console.error('Error updating org role:', error)
    return NextResponse.json({ error: 'Erro ao atualizar role' }, { status: 500 })
  }
}

/**
 * DELETE /api/users/[id]/organizations/[orgId]
 * Remove usuário de uma organização
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

    // Verificar permissão
    if (!hasPermission(session.user.globalRole || 'viewer', 'users.manage')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Deletar membership
    await db
      .delete(organizationMembers)
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
