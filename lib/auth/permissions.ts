/**
 * Sistema de Permissões RBAC
 * 5 níveis de roles com hierarquia clara
 */

export type GlobalRole = 'super_admin' | 'admin_fiscal' | 'user_fiscal' | 'consultor_ia' | 'viewer'
export type OrgRole = 'owner' | 'admin_fiscal' | 'user_fiscal' | 'consultor_ia' | 'viewer'

export type Permission =
  // Organizações
  | 'organizations.manage'
  | 'organizations.view'
  // Dados
  | 'data.upload'
  | 'data.view'
  | 'data.delete'
  | 'data.export'
  // Workflows
  | 'workflows.create'
  | 'workflows.execute'
  | 'workflows.view'
  | 'workflows.delete'
  | 'workflows.share'
  // Análises
  | 'analysis.run'
  | 'analysis.view'
  | 'analysis.export'
  // Chat IA
  | 'chat.use'
  | 'chat.view_history'
  // Configurações
  | 'settings.manage'
  | 'settings.view'
  // Usuários
  | 'users.manage'
  | 'users.invite'
  | 'users.view'
  // Relatórios
  | 'reports.create'
  | 'reports.view'
  | 'reports.export'

/**
 * Mapeamento de roles para permissões
 */
export const ROLE_PERMISSIONS: Record<GlobalRole | OrgRole, Permission[]> = {
  // Super Admin - Acesso total
  super_admin: [
    'organizations.manage',
    'organizations.view',
    'data.upload',
    'data.view',
    'data.delete',
    'data.export',
    'workflows.create',
    'workflows.execute',
    'workflows.view',
    'workflows.delete',
    'workflows.share',
    'analysis.run',
    'analysis.view',
    'analysis.export',
    'chat.use',
    'chat.view_history',
    'settings.manage',
    'settings.view',
    'users.manage',
    'users.invite',
    'users.view',
    'reports.create',
    'reports.view',
    'reports.export',
  ],

  // Owner (dentro da org) - Mesmas permissões do super_admin na sua org
  owner: [
    'organizations.view',
    'data.upload',
    'data.view',
    'data.delete',
    'data.export',
    'workflows.create',
    'workflows.execute',
    'workflows.view',
    'workflows.delete',
    'workflows.share',
    'analysis.run',
    'analysis.view',
    'analysis.export',
    'chat.use',
    'chat.view_history',
    'settings.manage',
    'settings.view',
    'users.manage',
    'users.invite',
    'users.view',
    'reports.create',
    'reports.view',
    'reports.export',
  ],

  // Admin Fiscal - Gerencia dados e workflows
  admin_fiscal: [
    'organizations.view',
    'data.upload',
    'data.view',
    'data.export',
    'workflows.create',
    'workflows.execute',
    'workflows.view',
    'workflows.share',
    'analysis.run',
    'analysis.view',
    'analysis.export',
    'chat.use',
    'chat.view_history',
    'settings.view',
    'users.invite',
    'users.view',
    'reports.create',
    'reports.view',
    'reports.export',
  ],

  // User Fiscal - Upload e análises básicas
  user_fiscal: [
    'data.upload',
    'data.view',
    'workflows.execute',
    'workflows.view',
    'analysis.run',
    'analysis.view',
    'reports.view',
  ],

  // Consultor IA - Foco em chat e análises
  consultor_ia: [
    'data.view',
    'workflows.view',
    'analysis.run',
    'analysis.view',
    'chat.use',
    'chat.view_history',
    'reports.view',
  ],

  // Viewer - Somente leitura (comercial)
  viewer: [
    'data.view',
    'workflows.view',
    'analysis.view',
    'reports.view',
  ],
}

/**
 * Verifica se um role tem uma permissão específica
 */
export function hasPermission(role: GlobalRole | OrgRole | undefined, permission: Permission): boolean {
  if (!role) return false
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes(permission)
}

/**
 * Verifica se um role tem TODAS as permissões especificadas
 */
export function hasAllPermissions(
  role: GlobalRole | OrgRole | undefined,
  permissions: Permission[]
): boolean {
  if (!role) return false
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Verifica se um role tem ALGUMA das permissões especificadas
 */
export function hasAnyPermission(
  role: GlobalRole | OrgRole | undefined,
  permissions: Permission[]
): boolean {
  if (!role) return false
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * Retorna todas as permissões de um role
 */
export function getRolePermissions(role: GlobalRole | OrgRole | undefined): Permission[] {
  if (!role) return []
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Hierarquia de roles (menor número = maior poder)
 */
const ROLE_HIERARCHY: Record<GlobalRole | OrgRole, number> = {
  super_admin: 0,
  owner: 1,
  admin_fiscal: 2,
  user_fiscal: 3,
  consultor_ia: 4,
  viewer: 5,
}

/**
 * Verifica se role1 tem maior ou igual autoridade que role2
 */
export function hasHigherOrEqualRole(
  role1: GlobalRole | OrgRole,
  role2: GlobalRole | OrgRole
): boolean {
  return ROLE_HIERARCHY[role1] <= ROLE_HIERARCHY[role2]
}

/**
 * Interface de contexto do usuário (para uso em middleware)
 */
export interface UserContext {
  id: string
  email: string
  fullName: string
  globalRole: GlobalRole
  organizationId: string | null
  orgRole: OrgRole | null
  permissions: Permission[]
}

/**
 * Verifica permissão no contexto do usuário
 */
export function checkUserPermission(
  user: UserContext,
  permission: Permission
): boolean {
  // Super admin sempre tem acesso
  if (user.globalRole === 'super_admin') {
    return true
  }

  // Verifica nas permissões do usuário (já mescladas de global + org)
  return user.permissions.includes(permission)
}

/**
 * Mescla permissões de role global e role org
 */
export function mergePermissions(
  globalRole: GlobalRole,
  orgRole: OrgRole | null
): Permission[] {
  const permissions = new Set<Permission>(getRolePermissions(globalRole))

  if (orgRole) {
    getRolePermissions(orgRole).forEach((p) => permissions.add(p))
  }

  return Array.from(permissions)
}

