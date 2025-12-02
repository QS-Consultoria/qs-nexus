import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db/index'
import { ragUsers } from '@/lib/db/schema/rag-users'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getUserWithOrganizations, updateLastLogin } from '@/lib/services/user-service'
import type { GlobalRole, OrgRole } from '@/lib/auth/permissions'

const authConfig = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db
          .select()
          .from(ragUsers)
          .where(eq(ragUsers.email, credentials.email as string))
          .limit(1)

        if (user.length === 0) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user[0].password
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        
        // Buscar informações completas do usuário
        const userWithOrgs = await getUserWithOrganizations(user.id as string)
        if (userWithOrgs) {
          token.globalRole = userWithOrgs.globalRole
          token.isActive = userWithOrgs.isActive
          
          // Pegar primeira organização ativa como padrão
          const defaultOrg = userWithOrgs.organizations.find(o => o.isActive)
          if (defaultOrg) {
            token.organizationId = defaultOrg.id
            token.organizationRole = defaultOrg.role
            token.organizationName = defaultOrg.name
          }
          
          // Atualizar último login
          await updateLastLogin(user.id as string)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.globalRole = token.globalRole as GlobalRole
        session.user.isActive = token.isActive as boolean
        session.user.organizationId = token.organizationId as string | null
        session.user.organizationRole = token.organizationRole as OrgRole | null
        session.user.organizationName = token.organizationName as string | null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export const { handlers, signIn, signOut, auth } = authConfig as any
