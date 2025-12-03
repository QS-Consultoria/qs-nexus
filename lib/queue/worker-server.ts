/**
 * Worker Server
 * Servidor standalone para processar jobs
 * 
 * Para usar em produção:
 * - Heroku: npm run worker
 * - Separar workers em diferentes dynos/containers
 */

import { startAllWorkers, stopAllWorkers } from './workers'

console.log('🚀 QS Nexus Worker Server')
console.log('==========================')

// Iniciar workers
const workers = startAllWorkers()

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n📛 SIGTERM recebido, encerrando workers...')
  await stopAllWorkers(workers)
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('\n📛 SIGINT recebido, encerrando workers...')
  await stopAllWorkers(workers)
  process.exit(0)
})

console.log('\n✅ Worker server rodando')
console.log('Pressione Ctrl+C para parar\n')

