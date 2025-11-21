'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  FileText,
  MessageSquare,
  Scale,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Arquivos', href: '/files', icon: FileText },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
]

interface AppSidebarProps {
  onLinkClick?: () => void
}

export function AppSidebar({ onLinkClick }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4 pb-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-auto py-3">
              <Link href="/dashboard" onClick={onLinkClick}>
                <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <Scale className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5 leading-tight">
                  <span className="font-semibold text-base">LegalWise</span>
                  <span className="text-xs text-muted-foreground">RAG Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map(item => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      size="default"
                      className="h-11 px-3 text-sm"
                    >
                      <Link href={item.href} onClick={onLinkClick}>
                        <Icon className="size-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 pt-6 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-4 text-xs w-full">
              <div className="font-semibold text-sm">Sistema RAG</div>
              <div className="text-muted-foreground">Versão 1.0.0</div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
