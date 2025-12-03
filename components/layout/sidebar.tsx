'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  Database,
  Settings,
  HelpCircle,
  Hexagon,
  ChevronLeft,
  Workflow,
  BarChart,
  FileText,
  FileCheck,
  Building2,
  Users,
  Bell,
  FileSpreadsheet,
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
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OrganizationSelector } from '@/components/organization/organization-selector'

const navigationGroups = [
  {
    title: 'Principal',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Chat IA', href: '/chat', icon: MessageSquare },
      { name: 'Notificações', href: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'Dados',
    items: [
      { name: 'Documentos', href: '/documentos', icon: FileText, description: 'PDFs, Word, Textos' },
      { name: 'Planilhas (CSV)', href: '/csv', icon: FileSpreadsheet, description: 'Planilhas de controle' },
      { name: 'SPED (Obrigações)', href: '/sped', icon: Database, description: 'ECD, ECF e EFD' },
      { name: 'Configurações de Dados', href: '/settings/data', icon: Settings },
    ],
  },
  {
    title: 'Análise e IA',
    items: [
      { name: 'Workflows', href: '/workflows', icon: Workflow },
      { name: 'Análises', href: '/analysis', icon: BarChart },
      { name: 'Relatórios', href: '/reports', icon: FileCheck },
      { name: 'Configurações de IA', href: '/settings/ai', icon: Settings },
    ],
  },
]

interface AppSidebarProps {
  onLinkClick?: () => void
}

export function AppSidebar({ onLinkClick }: AppSidebarProps) {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-[var(--qs-border)] bg-[var(--qs-surface)]"
    >
      {/* Header */}
      <SidebarHeader className="p-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link 
              href="/dashboard" 
              onClick={onLinkClick} 
              className="flex items-center gap-3 w-full py-3 px-2 hover:bg-[var(--qs-muted)] rounded-xl transition-all duration-200"
            >
              {/* Ícone com Gradiente Premium */}
              <div className="flex aspect-square size-10 items-center justify-center rounded-xl gradient-icon shrink-0">
                <Hexagon className="size-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col gap-0.5 leading-tight overflow-hidden">
                  <span className="font-semibold text-base text-[var(--qs-text)] truncate">
                    QS <span className="gradient-icon-text font-bold">Nexus</span>
                  </span>
                  <span className="text-xs text-[var(--qs-text-muted)] truncate">Inteligência de Dados</span>
                </div>
              )}
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Organization Selector */}
      <div className="px-4 pb-2">
        <OrganizationSelector collapsed={isCollapsed} />
      </div>

      {/* Collapse Toggle */}
      {!isCollapsed && (
        <div className="px-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-start gap-2 text-[var(--qs-text-muted)] hover:text-[var(--qs-text)] hover:bg-[var(--qs-muted)] rounded-lg h-8 cursor-pointer"
          >
            <ChevronLeft className="size-4 transition-transform duration-200" />
            <span className="text-xs">Recolher</span>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <SidebarContent className="px-3">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.title}>
            {!isCollapsed && (
              <SidebarGroupLabel className="px-3 mb-2 text-[10px] font-semibold text-[var(--qs-text-tertiary)] uppercase tracking-widest">
                {group.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map(item => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  const Icon = item.icon

                  const linkContent = (
                    <Link 
                      href={item.href} 
                      onClick={onLinkClick}
                      className={`flex items-center gap-3 w-full h-10 px-3 rounded-xl transition-all duration-200 ${
                        isActive 
                          ? 'bg-[var(--qs-green)] text-white font-semibold shadow-lg' 
                          : 'text-[var(--qs-text-secondary)] hover:bg-[var(--qs-muted)] hover:text-[var(--qs-text)]'
                      }`}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      {!isCollapsed && <span className="font-medium truncate">{item.name}</span>}
                    </Link>
                  )

                  return (
                    <SidebarMenuItem key={item.name}>
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {linkContent}
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            sideOffset={8}
                            className="bg-[var(--qs-card)] border-[var(--qs-border)] text-[var(--qs-text)] z-50"
                          >
                            {item.name}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        linkContent
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      {!isCollapsed && (
        <SidebarFooter className="p-4 pt-2 border-t border-[var(--qs-border)]">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 rounded-xl bg-[var(--qs-muted)] p-3 text-xs">
                <div className="flex items-center justify-center w-2 h-2 rounded-full bg-[var(--qs-success)] animate-pulse" />
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="font-medium text-[var(--qs-text)] truncate">QS Nexus</span>
                  <span className="text-[var(--qs-text-tertiary)] truncate">v2.0.0 • Online</span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  )
}
