#!/usr/bin/env tsx

/**
 * Script para iniciar worker SPED
 * 
 * Uso:
 *   npm run worker        # Desenvolvimento
 *   node dist/worker.js   # Produção
 */

import { startSpedWorker, stopSpedWorker } from '../lib/workers/sped-processor'

console.log('🚀 Starting SPED Worker...')
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`📍 Redis URL: ${process.env.REDIS_URL ? '✅ Configured' : '❌ Not configured'}`)

// Iniciar worker
const worker = startSpedWorker()

if (!worker) {
  console.error('❌ Failed to start worker - check Redis configuration')
  process.exit(1)
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⏳ SIGTERM received, shutting down gracefully...')
  await stopSpedWorker()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('\n⏳ SIGINT received, shutting down gracefully...')
  await stopSpedWorker()
  process.exit(0)
})

console.log('✅ Worker is running. Press Ctrl+C to stop.\n')

