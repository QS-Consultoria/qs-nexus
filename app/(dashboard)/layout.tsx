import { AppSidebar } from '@/components/layout/sidebar'
import { Navbar } from '@/components/layout/navbar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { auth } from '@/lib/auth/config'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar userName={session?.user?.name || null} userEmail={session?.user?.email || null} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
