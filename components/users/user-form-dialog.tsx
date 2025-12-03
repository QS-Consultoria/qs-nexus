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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { GlobalRole, OrgRole } from '@/lib/auth/permissions'

const globalRolesQS: GlobalRole[] = [
  'super_admin',
  'admin_fiscal',
  'user_fiscal',
  'consultor_ia',
  'viewer',
]

const globalRolesClient: GlobalRole[] = [
  'user_fiscal',
  'consultor_ia',
  'viewer',
]

const orgRoles: OrgRole[] = ['admin_fiscal', 'user_fiscal', 'consultor_ia', 'viewer']

const roleLabels: Record<GlobalRole | OrgRole, string> = {
  super_admin: 'Super Admin',
  owner: 'Proprietário',
  admin_fiscal: 'Admin Fiscal',
  user_fiscal: 'Usuário Fiscal',
  consultor_ia: 'Consultor IA',
  viewer: 'Visualizador',
}

interface Organization {
  id: string
  name: string
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  currentUserGlobalRole: GlobalRole
  organizations: Organization[]
}

export function UserFormDialog({
  open,
  onOpenChange,
  onSuccess,
  currentUserGlobalRole,
  organizations,
}: UserFormDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [globalRole, setGlobalRole] = useState<GlobalRole | ''>('')
  const [organizationId, setOrganizationId] = useState('')
  const [orgRole, setOrgRole] = useState<OrgRole>('user_fiscal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSuperAdmin = currentUserGlobalRole === 'super_admin'
  
  // Verificar se a organização selecionada é QS Consultoria
  const selectedOrg = organizations.find((org) => org.id === organizationId)
  const isQSConsultoria = selectedOrg?.name === 'QS Consultoria'
  
  // Definir quais roles globais estão disponíveis
  const availableGlobalRoles = isQSConsultoria ? globalRolesQS : globalRolesClient

  // Reset form quando abrir/fechar
  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setPassword('')
      setGlobalRole('')
      setOrganizationId('')
      setOrgRole('user_fiscal')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações simples
    if (!name || name.length < 2) {
      toast.error('Nome deve ter pelo menos 2 caracteres')
      return
    }
    if (!email || !email.includes('@')) {
      toast.error('Email inválido')
      return
    }
    if (!password || password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres')
      return
    }
    if (!organizationId) {
      toast.error('Selecione uma organização')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          globalRole: globalRole || undefined,
          organizationId,
          orgRole,
          isActive: true,
        }),
      })

      if (response.ok) {
        toast.success('Usuário criado com sucesso!')
        onOpenChange(false)
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao criar usuário')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Erro ao criar usuário')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo usuário ao sistema
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationId">Organização *</Label>
              <Select
                value={organizationId}
                onValueChange={(value) => {
                  setOrganizationId(value)
                  // Reset globalRole se não for QS Consultoria
                  const org = organizations.find((o) => o.id === value)
                  if (org?.name !== 'QS Consultoria' && globalRole === 'super_admin') {
                    setGlobalRole('')
                  }
                }}
              >
                <SelectTrigger id="organizationId">
                  <SelectValue placeholder="Selecione a organização" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isSuperAdmin && organizationId && (
              <div className="space-y-2">
                <Label htmlFor="globalRole">Role Global (Opcional)</Label>
                <Select
                  value={globalRole || undefined}
                  onValueChange={(value: GlobalRole | '') => {
                    setGlobalRole(value)
                  }}
                >
                  <SelectTrigger id="globalRole">
                    <SelectValue placeholder="Nenhuma - deixe em branco" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGlobalRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isQSConsultoria && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    ⚠️ Usuários de clientes não podem ser Super Admin ou Admin Fiscal
                  </p>
                )}
                {isQSConsultoria && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    ℹ️ QS Consultoria: pode criar Super Admins e Admins
                  </p>
                )}
              </div>
            )}

            {organizationId && (
              <div className="space-y-2">
                <Label htmlFor="orgRole">Role na Organização *</Label>
                <Select
                  value={orgRole}
                  onValueChange={(value: OrgRole) => setOrgRole(value)}
                >
                  <SelectTrigger id="orgRole">
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
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              type="button"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
