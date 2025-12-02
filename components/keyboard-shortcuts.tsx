'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Keyboard } from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
  action?: () => void
}

const shortcuts: Record<string, Shortcut[]> = {
  'Navegação': [
    {
      keys: ['⌘', 'K'],
      description: 'Abrir busca global',
    },
    {
      keys: ['G', 'D'],
      description: 'Ir para Dashboard',
    },
    {
      keys: ['G', 'C'],
      description: 'Ir para Chat IA',
    },
    {
      keys: ['G', 'U'],
      description: 'Ir para Upload',
    },
    {
      keys: ['G', 'F'],
      description: 'Ir para Arquivos',
    },
    {
      keys: ['G', 'N'],
      description: 'Ir para Notificações',
    },
    {
      keys: ['G', 'S'],
      description: 'Ir para Configurações',
    },
  ],
  'Ações': [
    {
      keys: ['?'],
      description: 'Mostrar atalhos de teclado',
    },
    {
      keys: ['ESC'],
      description: 'Fechar modals/dialogs',
    },
    {
      keys: ['Enter'],
      description: 'Confirmar ação selecionada',
    },
  ],
  'Chat': [
    {
      keys: ['↑', '↓'],
      description: 'Navegar pelo histórico',
    },
    {
      keys: ['Enter'],
      description: 'Enviar mensagem',
    },
    {
      keys: ['Shift', 'Enter'],
      description: 'Nova linha',
    },
  ],
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      
      // ? - Mostrar atalhos
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen(true)
        return
      }

      // ESC - Fechar dialog
      if (e.key === 'Escape' && open) {
        setOpen(false)
        return
      }

      // Navegação com G + tecla
      if (pressedKeys.has('g') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        switch (key) {
          case 'd':
            router.push('/dashboard')
            break
          case 'c':
            router.push('/chat')
            break
          case 'u':
            router.push('/upload')
            break
          case 'f':
            router.push('/files')
            break
          case 'n':
            router.push('/notifications')
            break
          case 's':
            router.push('/settings')
            break
        }
        setPressedKeys(new Set())
        return
      }

      // Adicionar tecla pressionada
      setPressedKeys(prev => new Set(prev).add(key))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.key) return
      setPressedKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(e.key.toLowerCase())
        return newSet
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [router, open, pressedKeys])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Atalhos de Teclado</DialogTitle>
          </div>
          <DialogDescription>
            Use estes atalhos para navegar mais rapidamente pelo sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(shortcuts).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <div key={keyIndex} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="px-2 py-1 font-mono text-xs bg-muted"
                          >
                            {key}
                          </Badge>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-dashed">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Pressione <kbd className="px-2 py-1 mx-1 rounded bg-background border">?</kbd> a qualquer momento para ver esta lista.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

