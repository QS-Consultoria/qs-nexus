#!/usr/bin/env tsx
/**
 * Script para promover um usuário a Super Admin
 * USO: npm run promote-admin -- admin@qsconsultoria.com.br
 */

import 'dotenv/config'
import { db } from '@/lib/db'
import { ragUsers } from '@/lib/db/schema/rag-users'
import { eq } from 'drizzle-orm'

async function promoteToSuperAdmin(email: string) {
  try {
    console.log(`🔍 Procurando usuário: ${email}`)

    const [user] = await db
      .select()
      .from(ragUsers)
      .where(eq(ragUsers.email, email))
      .limit(1)

    if (!user) {
      console.error(`❌ Usuário não encontrado: ${email}`)
      process.exit(1)
    }

    console.log(`📋 Usuário encontrado:`)
    console.log(`   Nome: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   GlobalRole atual: ${user.globalRole || 'null (viewer)'}`)

    // Atualizar para super_admin
    const [updated] = await db
      .update(ragUsers)
      .set({
        globalRole: 'super_admin',
        updatedAt: new Date(),
      })
      .where(eq(ragUsers.id, user.id))
      .returning()

    console.log(`\n✅ SUCESSO! Usuário promovido a Super Admin!`)
    console.log(`   Nome: ${updated.name}`)
    console.log(`   Email: ${updated.email}`)
    console.log(`   GlobalRole: ${updated.globalRole}`)
    console.log(`\n🔐 Faça logout e login novamente para as mudanças terem efeito!`)
  } catch (error) {
    console.error('❌ Erro ao promover usuário:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Pegar email dos argumentos
const email = process.argv[2]

if (!email) {
  console.error('❌ Uso: npm run promote-admin -- <email>')
  console.error('   Exemplo: npm run promote-admin -- admin@qsconsultoria.com.br')
  process.exit(1)
}

promoteToSuperAdmin(email)

