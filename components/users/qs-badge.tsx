'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, Star } from 'lucide-react'

interface QSBadgeProps {
  size?: 'sm' | 'md'
}

export function QSBadge({ size = 'md' }: QSBadgeProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <Badge
      variant="outline"
      className={`bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-950 dark:to-cyan-950 text-blue-700 dark:text-blue-400 ${textSize} font-medium border-blue-300 dark:border-blue-800 flex items-center gap-1.5 w-fit`}
      title="Membro da QS Consultoria - Permissões globais habilitadas"
    >
      <Star className={`${iconSize} fill-current`} />
      QS Global
      <Shield className={iconSize} />
    </Badge>
  )
}

