import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { ragUsers } from '@/lib/db/schema/rag-users'
import { organizations, organizationMembers } from '@/lib/db/schema/organizations'
import { eq, and, or, ilike, sql } from 'drizzle-orm'
import { createUserSchema, listUsersSchema } from '@/lib/schemas/user-schemas'
import { createUserWithMembership, emailExists } from '@/lib/services/user-service'
import { hasPermission } from '@/lib/auth/permissions'

/**
 * GET /api/users
 * Lista usuários com filtros
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão (aceita usuários sem globalRole como viewer)
    const userRole = session.user.globalRole || 'viewer'
    if (!hasPermission(userRole as any, 'users.view')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      organizationId: searchParams.get('organizationId'),
      role: searchParams.get('role'),
      status: searchParams.get('status') || 'all',
    }

    const filters = listUsersSchema.parse(queryParams)

    // Build query
    const conditions = []

    // Filtrar por status
    if (filters.status === 'active') {
      conditions.push(eq(ragUsers.isActive, true))
    } else if (filters.status === 'inactive') {
      conditions.push(eq(ragUsers.isActive, false))
    }

    // Filtrar por search
    if (filters.search) {
      conditions.push(
        or(
          ilike(ragUsers.name, `%${filters.search}%`),
          ilike(ragUsers.email, `%${filters.search}%`)
        )
      )
    }

    // Filtrar por role global
    if (filters.role) {
      conditions.push(eq(ragUsers.globalRole, filters.role as any))
    }

    // Super admin vê todos, outros veem apenas da sua org
    let usersList

    if (userRole === 'super_admin') {
      // Super admin vê todos
      usersList = await db
        .select({
          id: ragUsers.id,
          name: ragUsers.name,
          email: ragUsers.email,
          globalRole: ragUsers.globalRole,
          isActive: ragUsers.isActive,
          lastLoginAt: ragUsers.lastLoginAt,
          createdAt: ragUsers.createdAt,
        })
        .from(ragUsers)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(filters.limit)
        .offset((filters.page - 1) * filters.limit)
        .orderBy(ragUsers.createdAt)
    } else {
      // Outros veem apenas da sua org
      if (!session.user.organizationId) {
        return NextResponse.json({ users: [], total: 0, page: filters.page, limit: filters.limit })
      }

      usersList = await db
        .selectDistinct({
          id: ragUsers.id,
          name: ragUsers.name,
          email: ragUsers.email,
          globalRole: ragUsers.globalRole,
          isActive: ragUsers.isActive,
          lastLoginAt: ragUsers.lastLoginAt,
          createdAt: ragUsers.createdAt,
        })
        .from(ragUsers)
        .innerJoin(organizationMembers, eq(ragUsers.id, organizationMembers.userId))
        .where(
          and(
            eq(organizationMembers.organizationId, session.user.organizationId),
            ...(conditions.length > 0 ? conditions : [])
          )
        )
        .limit(filters.limit)
        .offset((filters.page - 1) * filters.limit)
        .orderBy(ragUsers.createdAt)
    }

    // Buscar organizações de cada usuário
    const usersWithOrgs = await Promise.all(
      usersList.map(async (user) => {
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
          .where(
            and(
              eq(organizationMembers.userId, user.id),
              eq(organizationMembers.isActive, true)
            )
          )

        return {
          ...user,
          organizations: orgs,
        }
      })
    )

    // Count total
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ragUsers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return NextResponse.json({
      users: usersWithOrgs,
      total: Number(total),
      page: filters.page,
      limit: filters.limit,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

/**
 * POST /api/users
 * Cria novo usuário
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão
    const canManage = hasPermission(session.user.globalRole, 'users.manage')
    const canInvite = hasPermission(session.user.globalRole, 'users.invite')

    if (!canManage && !canInvite) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const data = createUserSchema.parse(body)

    // Verificar se email já existe
    if (await emailExists(data.email)) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    // Buscar organização para validações
    const [targetOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, data.organizationId!))
      .limit(1)

    if (!targetOrg) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    // REGRA: Super Admin e Admin Fiscal só podem ser da QS Consultoria
    const isQSConsultoria = targetOrg.name === 'QS Consultoria'
    
    if (!isQSConsultoria && data.globalRole && ['super_admin', 'admin_fiscal'].includes(data.globalRole)) {
      return NextResponse.json(
        { error: 'Super Admin e Admin Fiscal só podem ser criados na QS Consultoria' },
        { status: 403 }
      )
    }

    // Se não é super_admin, só pode criar na própria org
    if (session.user.globalRole !== 'super_admin') {
      if (!data.organizationId || data.organizationId !== session.user.organizationId) {
        return NextResponse.json(
          { error: 'Você só pode criar usuários na sua organização' },
          { status: 403 }
        )
      }

      // Não pode definir globalRole
      if (data.globalRole && data.globalRole !== 'viewer') {
        return NextResponse.json(
          { error: 'Você não pode definir role global' },
          { status: 403 }
        )
      }
    }

    // Criar usuário
    const result = await createUserWithMembership(data, session.user.id)

    return NextResponse.json(
      {
        message: 'Usuário criado com sucesso',
        userId: result.userId,
        membershipId: result.membershipId,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating user:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}

