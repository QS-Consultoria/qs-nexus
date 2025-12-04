import Redis from 'ioredis'

// Configuração Redis para BullMQ
// Heroku Redis fornece REDIS_URL automaticamente
const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL

if (!redisUrl && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  REDIS_URL not configured. Job queue will not work.')
}

// Criar conexão Redis
export const redis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Requerido pelo BullMQ
      enableReadyCheck: false,
      // Heroku Redis usa TLS
      tls: redisUrl.includes('rediss://') ? {
        rejectUnauthorized: false,
      } : undefined,
    })
  : null

// Helper para verificar se Redis está disponível
export const isRedisAvailable = () => {
  return redis !== null && redis.status === 'ready'
}

// Log status
if (redis) {
  redis.on('connect', () => {
    console.log('✅ Redis connected')
  })

  redis.on('error', (err) => {
    console.error('❌ Redis error:', err.message)
  })

  redis.on('ready', () => {
    console.log('✅ Redis ready')
  })
} else {
  console.warn('⚠️  Redis not configured - job queue disabled')
}

