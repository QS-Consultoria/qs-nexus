'use client'

import { User, Search, Bell, Moon, Sun } from 'lucide-react'
import { LogoutButton } from './logout-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'

interface NavbarProps {
  userName?: string | null
  userEmail?: string | null
}

export function Navbar({ userName, userEmail }: NavbarProps) {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      {/* Search Bar */}
      <div className="relative hidden md:block flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search or type command..."
          className="h-9 w-full pl-9 pr-20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
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
