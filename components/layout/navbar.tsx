'use client'

import { User, Bell, Moon, Sun } from 'lucide-react'
import { LogoutButton } from './logout-button'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface NavbarProps {
  userName?: string | null
  userEmail?: string | null
}

export function Navbar({ userName, userEmail }: NavbarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="ml-auto flex items-center gap-2">
        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={toggleTheme}
          disabled={!mounted}
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle dark mode</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Notificações</span>
        </Button>

        {/* User profile */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 hover:bg-muted transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-medium leading-none">
              {userName || 'Usuário'}
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">
              {userEmail || ''}
            </span>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
