import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'
import type { GlobalRole, OrgRole } from '@/lib/auth/permissions'

interface RoleBadgeProps {
  role: GlobalRole | OrgRole
  size?: 'sm' | 'md'
}

const roleConfig: Record<GlobalRole | OrgRole, { label: string; color: string; bgColor: string }> = {
  super_admin: {
    label: 'Super Admin',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-800',
  },
  owner: {
    label: 'Owner',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
  },
  admin_fiscal: {
    label: 'Admin Fiscal',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  },
  user_fiscal: {
    label: 'User Fiscal',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-950 border-green-200 dark:border-green-800',
  },
  consultor_ia: {
    label: 'Consultor IA',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
  },
  viewer: {
    label: 'Viewer',
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  },
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const config = roleConfig[role]
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} ${textSize} font-medium border flex items-center gap-1.5 w-fit`}
    >
      <Shield className={iconSize} />
      {config.label}
    </Badge>
  )
}

