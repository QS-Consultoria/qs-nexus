import { z } from 'zod'

// Global roles disponíveis
export const globalRoles = [
  'super_admin',
  'admin_fiscal',
  'user_fiscal',
  'consultor_ia',
  'viewer',
] as const

// Organization roles disponíveis
export const orgRoles = [
  'admin_fiscal',
  'user_fiscal',
  'consultor_ia',
  'viewer',
] as const

// Schema para criar usuário
export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
  globalRole: z.enum(globalRoles).default('viewer'),
  organizationId: z.string().uuid('Organization ID inválido').optional(),
  orgRole: z.enum(orgRoles).default('viewer'),
  isActive: z.boolean().default(true),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

// Schema para atualizar usuário
export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100).optional(),
  globalRole: z.enum(globalRoles).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

// Schema para adicionar usuário a uma organização
export const addToOrgSchema = z.object({
  organizationId: z.string().uuid('Organization ID inválido'),
  role: z.enum(orgRoles).default('viewer'),
})

export type AddToOrgInput = z.infer<typeof addToOrgSchema>

// Schema para atualizar role em organização
export const updateOrgRoleSchema = z.object({
  role: z.enum(orgRoles),
})

export type UpdateOrgRoleInput = z.infer<typeof updateOrgRoleSchema>

// Schema para query params de listagem
export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  role: z.enum([...globalRoles, ...orgRoles]).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
})

export type ListUsersQuery = z.infer<typeof listUsersSchema>

