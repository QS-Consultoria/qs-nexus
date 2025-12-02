import { pgTable, text, uuid, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'

// Enum para roles de membros em organizações
export const orgRoleEnum = pgEnum('org_role', [
  'admin_fiscal',
  'user_fiscal',
  'consultor_ia',
  'viewer'
])

// Tabela de organizações
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  cnpj: text('cnpj').unique(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  isActive: boolean('is_active').default(true),
  settings: jsonb('settings').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Tabela de membros (relação usuários x organizações)
export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(), // Referencia rag_users
  role: orgRoleEnum('role').notNull().default('viewer'),
  invitedBy: uuid('invited_by'), // Usuário que convidou
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Types
export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type OrganizationMember = typeof organizationMembers.$inferSelect
export type NewOrganizationMember = typeof organizationMembers.$inferInsert

export type OrgRole = 'admin_fiscal' | 'user_fiscal' | 'consultor_ia' | 'viewer'
