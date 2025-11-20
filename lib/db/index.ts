import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/rag'

// Next.js automatically loads .env.local, so we don't need dotenv.config()
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables')
}

// Configurar pool de conexões para suportar múltiplos workers
const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10)

const client = postgres(process.env.DATABASE_URL, {
  max: maxConnections,
  idle_timeout: 20,
  max_lifetime: 60 * 30, // 30 minutos
})

export const db = drizzle(client, { schema })

export { schema }
