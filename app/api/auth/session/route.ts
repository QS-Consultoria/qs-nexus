import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/stack-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      expires: session.expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Erro ao obter sessão:', error)
    return NextResponse.json({ user: null })
  }
}

