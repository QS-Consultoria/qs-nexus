import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { ragUsers } from '@/lib/db/schema/rag-users'
import { eq } from 'drizzle-orm'
import { updateUserSchema } from '@/lib/schemas/user-schemas'
import { getUserWithOrganizations, canManageUser, deactivateUser } from '@/lib/services/user-service'
import { hasPermission } from '@/lib/auth/permissions'

/**
 * GET /api/users/[id]
 * Retorna detalhes de um usuário
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

    // Verificar permissão
    if (!hasPermission(session.user.globalRole, 'users.view')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const user = await getUserWithOrganizations(params.id)

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Se não é super_admin, só pode ver usuários da mesma org
    if (session.user.globalRole !== 'super_admin') {
      const hasCommonOrg = user.organizations.some(
        org => org.id === session.user.organizationId && org.isActive
      )
      
      if (!hasCommonOrg && user.id !== session.user.id) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }
    }

    // Não retornar senha
    const { password, ...userWithoutPassword } = user as any

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 })
  }
}

/**
 * PATCH /api/users/[id]
 * Atualiza usuário
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

    // Verificar permissão
    if (!hasPermission(session.user.globalRole, 'users.manage')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateUserSchema.parse(body)

    // Verificar se pode gerenciar este usuário
    const canEdit = await canManageUser(session.user.id, params.id, session.user.organizationId || undefined)
    
    if (!canEdit && session.user.id !== params.id) {
      return NextResponse.json(
        { error: 'Você não pode editar este usuário' },
        { status: 403 }
      )
    }

    // Se não é super_admin, não pode alterar globalRole
    if (data.globalRole && session.user.globalRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Apenas super admin pode alterar role global' },
        { status: 403 }
      )
    }

    // Atualizar usuário
    const [updated] = await db
      .update(ragUsers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(ragUsers.id, params.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Buscar user completo
    const user = await getUserWithOrganizations(updated.id)

    return NextResponse.json({
      message: 'Usuário atualizado com sucesso',
      user,
    })
  } catch (error: any) {
    console.error('Error updating user:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

/**
 * DELETE /api/users/[id]
 * Desativa usuário (soft delete)
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

    // Apenas super_admin pode deletar
    if (session.user.globalRole !== 'super_admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Não pode deletar a si mesmo
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Você não pode deletar a si mesmo' },
        { status: 400 }
      )
    }

    // Desativar usuário
    await deactivateUser(params.id)

    return NextResponse.json({ message: 'Usuário desativado com sucesso' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Erro ao deletar usuário' }, { status: 500 })
  }
}

