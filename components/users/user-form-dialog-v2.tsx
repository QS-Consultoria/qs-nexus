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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const globalRoles: GlobalRole[] = ['super_admin', 'admin_fiscal', 'user_fiscal', 'consultor_ia', 'viewer']
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

interface UserFormDialogV2Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user?: any | null
  currentUserGlobalRole: GlobalRole
  organizations: Organization[]
}

export function UserFormDialogV2({
  open,
  onOpenChange,
  onSuccess,
  user,
  currentUserGlobalRole,
  organizations,
}: UserFormDialogV2Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [globalRole, setGlobalRole] = useState<GlobalRole | ''>('')
  const [organizationId, setOrganizationId] = useState('')
  const [orgRole, setOrgRole] = useState<OrgRole>('user_fiscal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSuperAdmin = currentUserGlobalRole === 'super_admin'
  const isEditing = !!user

  // Reset form quando abrir/fechar
  useEffect(() => {
    if (open) {
      if (user) {
        setName(user.name || '')
        setEmail(user.email || '')
        setPassword('')
        setGlobalRole(user.globalRole || '')
        setOrganizationId(user.organizations?.[0]?.id || '')
        setOrgRole(user.organizations?.[0]?.role || 'user_fiscal')
      } else {
        setName('')
        setEmail('')
        setPassword('')
        setGlobalRole('')
        setOrganizationId('')
        setOrgRole('user_fiscal')
      }
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || name.length < 2) {
      toast.error('Nome deve ter pelo menos 2 caracteres')
      return
    }
    if (!isEditing && (!email || !email.includes('@'))) {
      toast.error('Email inválido')
      return
    }
    if (!isEditing && (!password || password.length < 6)) {
      toast.error('Senha deve ter pelo menos 6 caracteres')
      return
    }
    if (!organizationId) {
      toast.error('Selecione uma organização')
      return
    }

    setIsSubmitting(true)
    try {
      const method = isEditing ? 'PATCH' : 'POST'
      const url = isEditing ? `/api/users/${user.id}` : '/api/users'
      
      const payload: any = {
        name,
        isActive: true,
      }
      
      if (!isEditing) {
        payload.email = email
        payload.password = password
        payload.organizationId = organizationId
        payload.orgRole = orgRole
        
        // SEMPRE enviar globalRole se super_admin (null se vazio)
        if (isSuperAdmin) {
          payload.globalRole = globalRole || null
        }
      } else {
        // Edição: apenas name e globalRole
        if (isSuperAdmin) {
          payload.globalRole = globalRole || null
        }
      }

      console.log('📤 ENVIANDO:', method, url, JSON.stringify(payload, null, 2))

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(isEditing ? 'Usuário atualizado!' : 'Usuário criado!')
        onOpenChange(false)
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar usuário')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erro ao salvar usuário')
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
              <DialogTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Atualize as informações do usuário' : 'Adicione um novo usuário ao sistema'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>

          {!isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  required
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
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="organizationId">Organização *</Label>
            <Select value={organizationId} onValueChange={setOrganizationId} required>
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

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="orgRole">Role na Organização *</Label>
              <Select value={orgRole} onValueChange={(v: OrgRole) => setOrgRole(v)} required>
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

          {isSuperAdmin && (
            <div className="space-y-2">
              <Label htmlFor="globalRole">
                Role Global (Opcional)
                <span className="text-xs text-muted-foreground ml-2">
                  - Deixe vazio para Viewer padrão
                </span>
              </Label>
              <Select
                value={globalRole || undefined}
                onValueChange={(value: GlobalRole | '') => {
                  console.log('🔄 Role selecionado:', value)
                  setGlobalRole(value)
                }}
              >
                <SelectTrigger id="globalRole">
                  <SelectValue placeholder="Nenhum (será Viewer)" />
                </SelectTrigger>
                <SelectContent>
                  {globalRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                ✨ Super Admin pode criar qualquer role
              </p>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                🔒 Apenas Super Admin pode definir Role Global (você: {currentUserGlobalRole})
              </p>
            </div>
          )}
        </form>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

