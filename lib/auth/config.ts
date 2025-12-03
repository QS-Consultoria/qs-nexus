import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db/index'
import { ragUsers } from '@/lib/db/schema/rag-users'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getUserWithOrganizations, updateLastLogin, getQSConsultoriaRole } from '@/lib/services/user-service'
import type { GlobalRole, OrgRole } from '@/lib/auth/permissions'

const authConfig = NextAuth({
  trustHost: true,
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        
        try {
          // Buscar informações completas do usuário
          const userWithOrgs = await getUserWithOrganizations(user.id as string)
          if (userWithOrgs) {
            token.globalRole = userWithOrgs.globalRole
            token.isActive = userWithOrgs.isActive
            
            // 🔑 REGRA: Verificar se usuário pertence à QS Consultoria
            const qsRole = await getQSConsultoriaRole(user.id as string)
            token.qsConsultoriaRole = qsRole
            
            // Pegar primeira organização ativa como padrão
            const defaultOrg = userWithOrgs.organizations.find(o => o.isActive)
            if (defaultOrg) {
              token.organizationId = defaultOrg.id
              token.organizationName = defaultOrg.name
              
              // 🎯 Se pertence à QS, usa o role da QS em TODAS as orgs
              if (qsRole) {
                token.organizationRole = qsRole
                console.log(`✅ User ${user.email} from QS Consultoria - using QS role: ${qsRole}`)
              } else {
                token.organizationRole = defaultOrg.role
              }
            }
            
            // Atualizar último login
            await updateLastLogin(user.id as string)
          } else {
            // Fallback: se não encontrar org, define valores padrão
            console.warn('⚠️ UserWithOrgs é null! Usando fallback viewer')
            token.globalRole = 'viewer'
            token.isActive = true
            token.organizationId = null
            token.organizationRole = null
            token.organizationName = null
            token.qsConsultoriaRole = null
          }
        } catch (error) {
          console.error('❌ Error fetching user organizations:', error)
          // Fallback em caso de erro
          token.globalRole = 'viewer'
          token.isActive = true
          token.organizationId = null
          token.organizationRole = null
          token.organizationName = null
          token.qsConsultoriaRole = null
        }
      }
      
      // 🔄 ATUALIZAR token em toda requisição para pegar mudanças no DB
      if (token.id && trigger !== 'signIn') {
        try {
          const userWithOrgs = await getUserWithOrganizations(token.id as string)
          if (userWithOrgs) {
            const currentGlobalRole = token.globalRole
            const newGlobalRole = userWithOrgs.globalRole || 'viewer'
            
            if (currentGlobalRole !== newGlobalRole) {
              console.log(`🔄 GlobalRole mudou de ${currentGlobalRole} → ${newGlobalRole} para ${token.email}`)
              token.globalRole = newGlobalRole
            }
          }
        } catch (error) {
          console.error('❌ Error updating token:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        const user = session.user as any
        user.id = token.id as string
        user.email = token.email as string
        user.name = token.name as string
        user.globalRole = token.globalRole as GlobalRole
        user.isActive = token.isActive as boolean
        user.organizationId = token.organizationId as string | null
        user.organizationRole = token.organizationRole as OrgRole | null
        user.organizationName = token.organizationName as string | null
        user.qsConsultoriaRole = token.qsConsultoriaRole as OrgRole | null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export const { handlers, signIn, signOut, auth } = authConfig as any
