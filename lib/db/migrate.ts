// Load .env.local FIRST before importing db
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables')
  }

  console.log('Connecting to database...')
  const client = postgres(databaseUrl, { max: 1, ssl: 'require' })
  const db = drizzle(client)

  console.log('Running migrations...')
  const migrationsFolder = join(__dirname, 'migrations')
  await migrate(db, { migrationsFolder })
  console.log('Migrations completed!')
  
  await client.end()
  process.exit(0)
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
