import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as ragSchema from './schema/rag'
import * as spedSchema from './schema/sped'
import * as workflowSchema from './schema/workflows'
import * as organizationsSchema from './schema/organizations'
import * as metadataSchema from './schema/metadata-schemas'
import * as documentsSchema from './schema/documents'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local for scripts (Next.js loads it automatically for server/client)
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env.local') })
}

// Mesclar todos os schemas
const schema = {
  ...ragSchema,
  ...spedSchema,
  ...workflowSchema,
  ...organizationsSchema,
  ...metadataSchema,
  ...documentsSchema,
}

// Validate DATABASE_URL after attempting to load
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables')
}

// Configurar pool de conexões para suportar múltiplos workers
const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10)

const client = postgres(process.env.DATABASE_URL, {
  max: maxConnections,
  idle_timeout: 20,
  max_lifetime: 60 * 30, // 30 minutos
  ssl: { rejectUnauthorized: false }, // Required for Heroku Postgres
})

export const db = drizzle(client, { schema })

export { schema }
