'use client'

import { signOut } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { LogOut, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirectTo: '/login' })
    router.push('/login')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-lg hover:bg-gray-200"
      onClick={handleLogout}
      title="Sair"
    >
      <LogOut className="h-4 w-4 text-gray-600" />
    </Button>
  )
}
