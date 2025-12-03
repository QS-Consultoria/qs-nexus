'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { OrgRole } from '@/lib/auth/permissions'
import { RoleBadge } from './role-badge'

interface Organization {
  id: string
  name: string
}

interface UserOrgManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    name: string
    email: string
    organizations: Array<{
      id: string
      name: string
      role: string
    }>
  } | null
  allOrganizations: Organization[]
  onSuccess: () => void
}

const roleLabels: Record<OrgRole, string> = {
  owner: 'Proprietário',
  admin_fiscal: 'Admin Fiscal',
  user_fiscal: 'Usuário Fiscal',
  consultor_ia: 'Consultor IA',
  viewer: 'Visualizador',
}

const orgRoles: OrgRole[] = ['admin_fiscal', 'user_fiscal', 'consultor_ia', 'viewer']

export function UserOrgManagerDialog({
  open,
  onOpenChange,
  user,
  allOrganizations,
  onSuccess,
}: UserOrgManagerDialogProps) {
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedRole, setSelectedRole] = useState<OrgRole>('user_fiscal')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedOrgId('')
      setSelectedRole('user_fiscal')
    }
  }, [open])

  if (!user) return null

  const handleAddToOrg = async () => {
    if (!selectedOrgId) {
      toast.error('Selecione uma organização')
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch(`/api/users/${user.id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          role: selectedRole,
        }),
      })

      if (response.ok) {
        toast.success('Usuário adicionado à organização!')
        setSelectedOrgId('')
        setSelectedRole('user_fiscal')
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao adicionar à organização')
      }
    } catch (error) {
      console.error('Error adding to org:', error)
      toast.error('Erro ao adicionar à organização')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveFromOrg = async (orgId: string, orgName: string) => {
    if (!confirm(`Remover ${user.name} da organização "${orgName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${user.id}/organizations/${orgId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Usuário removido da organização!')
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao remover da organização')
      }
    } catch (error) {
      console.error('Error removing from org:', error)
      toast.error('Erro ao remover da organização')
    }
  }

  const handleChangeRole = async (orgId: string, orgName: string, currentRole: OrgRole) => {
    const newRole = prompt(
      `Alterar role de ${user.name} em "${orgName}":\n\nRole atual: ${roleLabels[currentRole]}\n\nDigite o novo role:\n- admin_fiscal\n- user_fiscal\n- consultor_ia\n- viewer`
    )

    if (!newRole || !['owner', 'admin_fiscal', 'user_fiscal', 'consultor_ia', 'viewer'].includes(newRole)) {
      toast.error('Role inválido')
      return
    }

    try {
      const response = await fetch(`/api/users/${user.id}/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        toast.success('Role atualizado!')
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao atualizar role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Erro ao atualizar role')
    }
  }

  const availableOrgs = allOrganizations.filter(
    (org) => !user.organizations.some((uOrg) => uOrg.id === org.id)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Gerenciar Organizações</DialogTitle>
              <DialogDescription>
                {user.name} - {user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Organizações atuais */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Organizações Vinculadas</h3>
            {user.organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma organização vinculada</p>
            ) : (
              <div className="space-y-2">
                {user.organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                      <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{org.name}</p>
                        <RoleBadge role={org.role as any} size="sm" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangeRole(org.id, org.name, org.role as OrgRole)}
                      >
                        Alterar Role
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromOrg(org.id, org.name)}
                        className="text-destructive hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adicionar a nova organização */}
          {availableOrgs.length > 0 && (
            <div className="space-y-3 pt-3 border-t">
              <h3 className="text-sm font-medium">Adicionar a Organização</h3>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma organização" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Select value={selectedRole} onValueChange={(v: OrgRole) => setSelectedRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orgRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddToOrg} disabled={isAdding || !selectedOrgId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

