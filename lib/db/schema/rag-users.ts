import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

// Enum for global user roles
export const globalRoleEnum = pgEnum('global_role', [
  'super_admin',
  'admin_fiscal',
  'user_fiscal',
  'consultor_ia',
  'viewer'
])

export const ragUsers = pgTable('rag_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  globalRole: globalRoleEnum('global_role').default('viewer'),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type RagUser = typeof ragUsers.$inferSelect
export type NewRagUser = typeof ragUsers.$inferInsert
