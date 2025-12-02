import 'next-auth'
import type { GlobalRole, OrgRole } from '@/lib/auth/permissions'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      globalRole: GlobalRole
      isActive: boolean
      organizationId: string | null
      organizationRole: OrgRole | null
      organizationName: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    globalRole?: GlobalRole
    isActive?: boolean
    organizationId?: string | null
    organizationRole?: OrgRole | null
    organizationName?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string
    globalRole: GlobalRole
    isActive: boolean
    organizationId?: string | null
    organizationRole?: OrgRole | null
    organizationName?: string | null
  }
}
