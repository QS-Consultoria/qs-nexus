import { db } from '@/lib/db'
import { ragUsers } from '@/lib/db/schema/rag-users'
import { organizations, organizationMembers } from '@/lib/db/schema/organizations'
import { eq, and, or, ilike, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { 
  GlobalRole, 
  OrgRole, 
  Permission, 
  getRolePermissions, 
  mergePermissions 
} from '@/lib/auth/permissions'
import type { CreateUserInput } from '@/lib/schemas/user-schemas'

/**
 * Interface para usuário com suas organizações
 */
export interface UserWithOrganizations {
  id: string
  email: string
  name: string
  globalRole: GlobalRole
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  organizations: Array<{
    id: string
    name: string
    slug: string
    role: OrgRole
    isActive: boolean
  }>
}

/**
 * Busca usuário com todas as suas organizações e roles
 */
export async function getUserWithOrganizations(
  userId: string
): Promise<UserWithOrganizations | null> {
  try {
    const [user] = await db
      .select()
      .from(ragUsers)
      .where(eq(ragUsers.id, userId))
      .limit(1)

    if (!user) {
      return null
    }

    // Buscar organizações do usuário
    const userOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: organizationMembers.role,
        isActive: organizationMembers.isActive,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))

    return {
      ...user,
      globalRole: user.globalRole as GlobalRole,
      organizations: userOrgs.map(org => ({
        ...org,
        role: org.role as OrgRole,
      })),
    }
  } catch (error) {
    console.error('Error fetching user with organizations:', error)
    throw error
  }
}

/**
 * Calcula todas as permissões de um usuário
 */
export async function getUserPermissions(
  userId: string,
  organizationId?: string
): Promise<Permission[]> {
  try {
    const user = await getUserWithOrganizations(userId)
    
    if (!user) {
      return []
    }

    // Se super_admin, retorna todas as permissões
    if (user.globalRole === 'super_admin') {
      return getRolePermissions('super_admin')
    }

    // Se organizationId especificado, busca role nessa org
    let orgRole: OrgRole | null = null
    if (organizationId) {
      const org = user.organizations.find(o => o.id === organizationId && o.isActive)
      if (org) {
        orgRole = org.role
      }
    }

    // Mescla permissões de global role + org role
    return mergePermissions(user.globalRole, orgRole)
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

/**
 * Verifica se um usuário pode gerenciar outro usuário
 */
export async function canManageUser(
  actorId: string,
  targetUserId: string,
  organizationId?: string
): Promise<boolean> {
  try {
    const actor = await getUserWithOrganizations(actorId)
    const target = await getUserWithOrganizations(targetUserId)

    if (!actor || !target) {
      return false
    }

    // Super admin pode gerenciar qualquer usuário
    if (actor.globalRole === 'super_admin') {
      return true
    }

    // Se há organizationId, verifica se actor é admin dessa org
    if (organizationId) {
      const actorOrgMembership = actor.organizations.find(
        o => o.id === organizationId && o.isActive
      )
      const targetOrgMembership = target.organizations.find(
        o => o.id === organizationId && o.isActive
      )

      // Actor deve ser admin_fiscal da org e target deve estar na mesma org
      return (
        actorOrgMembership?.role === 'admin_fiscal' &&
        targetOrgMembership !== undefined
      )
    }

    // Sem org especificada, não pode gerenciar
    return false
  } catch (error) {
    console.error('Error checking manage permission:', error)
    return false
  }
}

/**
 * Cria usuário com membership atômico
 */
export async function createUserWithMembership(
  data: CreateUserInput,
  createdById: string
): Promise<{ userId: string; membershipId?: string }> {
  try {
    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Criar usuário
    const [newUser] = await db
      .insert(ragUsers)
      .values({
        email: data.email,
        password: hashedPassword,
        name: data.name,
        globalRole: data.globalRole || 'viewer',
        isActive: data.isActive ?? true,
      })
      .returning()

    let membershipId: string | undefined

    // Se organizationId fornecido, criar membership
    if (data.organizationId) {
      const [membership] = await db
        .insert(organizationMembers)
        .values({
          organizationId: data.organizationId,
          userId: newUser.id,
          role: data.orgRole || 'viewer',
          invitedBy: createdById,
          invitedAt: new Date(),
          isActive: true,
        })
        .returning()

      membershipId = membership.id
    }

    return {
      userId: newUser.id,
      membershipId,
    }
  } catch (error) {
    console.error('Error creating user with membership:', error)
    throw error
  }
}

/**
 * Atualiza último login do usuário
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await db
      .update(ragUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(ragUsers.id, userId))
  } catch (error) {
    console.error('Error updating last login:', error)
    // Não lançar erro, é não-crítico
  }
}

/**
 * Verifica se email já existe
 */
export async function emailExists(email: string): Promise<boolean> {
  try {
    const [user] = await db
      .select({ id: ragUsers.id })
      .from(ragUsers)
      .where(eq(ragUsers.email, email))
      .limit(1)

    return !!user
  } catch (error) {
    console.error('Error checking email existence:', error)
    return false
  }
}

/**
 * Desativa usuário (soft delete)
 */
export async function deactivateUser(userId: string): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Desativar usuário
      await tx
        .update(ragUsers)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(ragUsers.id, userId))

      // Desativar todos os memberships
      await tx
        .update(organizationMembers)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(organizationMembers.userId, userId))
    })
  } catch (error) {
    console.error('Error deactivating user:', error)
    throw error
  }
}

/**
 * Conta usuários por filtros
 */
export async function countUsers(filters: {
  organizationId?: string
  role?: string
  status?: 'active' | 'inactive' | 'all'
}): Promise<number> {
  try {
    const conditions = []

    if (filters.status === 'active') {
      conditions.push(eq(ragUsers.isActive, true))
    } else if (filters.status === 'inactive') {
      conditions.push(eq(ragUsers.isActive, false))
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ragUsers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return Number(result.count)
  } catch (error) {
    console.error('Error counting users:', error)
    return 0
  }
}

