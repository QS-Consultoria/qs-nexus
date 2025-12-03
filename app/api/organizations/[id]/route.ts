import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { organizations, organizationMembers } from '@/lib/db/schema/organizations'
import { eq, and } from 'drizzle-orm'
import { hasPermission } from '@/lib/auth/permissions'

/**
 * GET /api/organizations/[id]
 * Retorna detalhes de uma organização
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

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, params.id))
      .limit(1)

    if (!org) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    // Buscar membros
    const members = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, params.id),
          eq(organizationMembers.isActive, true)
        )
      )

    return NextResponse.json({
      organization: {
        ...org,
        membersCount: members.length,
      },
    })
  } catch (error) {
    console.error('Error fetching organization:', error)
    return NextResponse.json({ error: 'Erro ao buscar organização' }, { status: 500 })
  }
}

/**
 * PATCH /api/organizations/[id]
 * Atualiza uma organização
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Apenas super_admin pode editar organizações
    if (!hasPermission(session.user.globalRole, 'organizations.manage')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { name, cnpj, isActive } = body

    const [updated] = await db
      .update(organizations)
      .set({
        name: name || undefined,
        cnpj: cnpj || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, params.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ organization: updated })
  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json({ error: 'Erro ao atualizar organização' }, { status: 500 })
  }
}

/**
 * DELETE /api/organizations/[id]
 * Desativa uma organização (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Apenas super_admin pode deletar organizações
    if (!hasPermission(session.user.globalRole, 'organizations.manage')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Verificar se não é a organização principal (QS Consultoria)
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, params.id))
      .limit(1)

    if (!org) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    if (org.slug === 'qs-consultoria') {
      return NextResponse.json(
        { error: 'Não é possível deletar a organização principal (QS Consultoria)' },
        { status: 403 }
      )
    }

    // Soft delete
    const [deleted] = await db
      .update(organizations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, params.id))
      .returning()

    return NextResponse.json({
      message: 'Organização desativada com sucesso',
      organization: deleted,
    })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Erro ao deletar organização' }, { status: 500 })
  }
}
