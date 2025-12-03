'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'

const ALL_GLOBAL_ROLES = ['super_admin', 'admin_fiscal', 'user_fiscal', 'consultor_ia', 'viewer']
const ALL_ORG_ROLES = ['admin_fiscal', 'user_fiscal', 'consultor_ia', 'viewer']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  organizations: Array<{ id: string; name: string }>
}

export function UserFormSimple({ open, onOpenChange, onSuccess, organizations }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [globalRole, setGlobalRole] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [orgRole, setOrgRole] = useState('user_fiscal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload: any = {
        name,
        email,
        password,
        organizationId,
        orgRole,
        isActive: true,
      }

      if (globalRole) {
        payload.globalRole = globalRole
      }

      console.log('📤 ENVIANDO:', JSON.stringify(payload, null, 2))

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('Usuário criado!')
        setName('')
        setEmail('')
        setPassword('')
        setGlobalRole('')
        setOrganizationId('')
        setOrgRole('user_fiscal')
        onOpenChange(false)
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro')
      }
    } catch (error) {
      toast.error('Erro ao criar usuário')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <Label>Senha *</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div>
            <Label>Organização *</Label>
            <Select value={organizationId} onValueChange={setOrganizationId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
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

          <div>
            <Label>Role na Organização *</Label>
            <Select value={orgRole} onValueChange={setOrgRole} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ORG_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Role Global (OPCIONAL - deixe vazio para viewer)</Label>
            <Select value={globalRole} onValueChange={setGlobalRole}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum (viewer)" />
              </SelectTrigger>
              <SelectContent>
                {ALL_GLOBAL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-green-600 mt-1">
              ✅ SUPER ADMIN ESTÁ DISPONÍVEL!
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

