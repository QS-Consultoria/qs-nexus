'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus, Search, Edit2, Building2, Shield, CheckCircle2, XCircle, Ban, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { RoleBadge } from '@/components/users/role-badge'
import { UserFormSimple as UserFormDialog } from '@/components/users/user-form-simple'
import { UserOrgManagerDialog } from '@/components/users/user-org-manager-dialog'
import { useSession } from 'next-auth/react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { GlobalRole } from '@/lib/auth/permissions'

interface User {
  id: string
  name: string
  email: string
  globalRole: string
  isActive: boolean
  lastLoginAt: Date | null
  organizations: Array<{
    id: string
    name: string
    role: string
    isActive: boolean
  }>
}

interface Stats {
  total: number
  active: number
  inactive: number
  byRole: Record<string, number>
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false)
  const [managingOrgUser, setManagingOrgUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // DEBUG - Ver qual globalRole está chegando
  useEffect(() => {
    if (session?.user) {
      console.log('🔍 SESSION DEBUG:', {
        status,
        email: session.user.email,
        globalRole: (session.user as any).globalRole,
        type: typeof (session.user as any).globalRole,
      })
    }
  }, [session, status])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [usersRes, statsRes, orgsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/users/stats'),
        fetch('/api/organizations'),
      ])

      console.log('📊 Users Response:', usersRes.status, usersRes.ok)
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        console.log('📊 Users Data:', data)
        setUsers(data.users || [])
      } else {
        const error = await usersRes.json()
        console.error('❌ Users Error:', error)
        toast.error(`Erro ao carregar usuários: ${error.error || 'Erro desconhecido'}`)
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }

      if (orgsRes.ok) {
        const data = await orgsRes.json()
        setOrganizations(data.organizations || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSoftDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`❓ Desativar o usuário "${userName}"?\n\n✅ DESATIVAR (Soft Delete):\n• O usuário será marcado como inativo\n• Os dados serão preservados\n• Pode ser reativado depois\n\nPressione OK para confirmar.`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('✅ Usuário desativado com sucesso!')
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao desativar usuário')
      }
    } catch (error) {
      console.error('Erro ao desativar usuário:', error)
      toast.error('Erro ao desativar usuário')
    }
  }

  const handleHardDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`⚠️ ATENÇÃO: DELETAR PERMANENTEMENTE "${userName}"?\n\n🗑️ DELETAR PERMANENTEMENTE (Hard Delete):\n• O usuário será REMOVIDO PARA SEMPRE\n• TODOS os dados serão PERDIDOS\n• NÃO pode ser desfeito\n\nDigite "DELETAR" para confirmar.`)) {
      return
    }

    // Pedir confirmação extra
    const confirmText = prompt('⚠️ Digite "DELETAR" (em maiúsculas) para confirmar a exclusão permanente:')
    if (confirmText !== 'DELETAR') {
      toast.error('Operação cancelada')
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}?hard=true`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('🗑️ Usuário deletado permanentemente!')
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao deletar usuário')
      }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      toast.error('Erro ao deletar usuário')
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const handleNewUser = () => {
    setEditingUser(null)
    setIsDialogOpen(true)
  }

  const handleManageOrgs = (user: User) => {
    setManagingOrgUser(user)
    setIsOrgDialogOpen(true)
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Usuários
          </h1>
          <p className="text-muted-foreground">
            Gerencie usuários e permissões de acesso ao sistema
          </p>
        </div>
        <Button onClick={handleNewUser}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">usuários cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">em operação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inactive || 0}</div>
            <p className="text-xs text-muted-foreground">desativados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.byRole?.admin_fiscal || 0) + (stats?.byRole?.super_admin || 0)}
            </div>
            <p className="text-xs text-muted-foreground">administradores</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role Global</TableHead>
                  <TableHead>Organizações</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={user.globalRole as any} size="sm" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.organizations.slice(0, 2).map((org) => (
                            <Badge key={org.id} variant="outline" className="text-xs">
                              {org.name}
                            </Badge>
                          ))}
                          {user.organizations.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.organizations.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastLoginAt
                          ? formatDistanceToNow(new Date(user.lastLoginAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Editar"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Gerenciar organizações"
                            onClick={() => handleManageOrgs(user)}
                          >
                            <Building2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Desativar (Soft Delete) - Pode ser reativado depois"
                            onClick={() => handleSoftDeleteUser(user.id, user.name)}
                            className="text-amber-600 hover:text-amber-700 dark:text-amber-500"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Deletar Permanentemente (Hard Delete) - NÃO pode ser desfeito!"
                            onClick={() => handleHardDeleteUser(user.id, user.name)}
                            className="text-destructive hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadData}
        organizations={organizations}
      />

      <UserOrgManagerDialog
        open={isOrgDialogOpen}
        onOpenChange={setIsOrgDialogOpen}
        user={managingOrgUser}
        allOrganizations={organizations}
        onSuccess={loadData}
      />
    </div>
  )
}

