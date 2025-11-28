# QS Nexus - Production Dockerfile para Heroku

FROM node:20-alpine AS base

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar package files
COPY package*.json ./

# ================================
# Dependencies stage
# ================================
FROM base AS deps

RUN npm ci

# ================================
# Builder stage
# ================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args
ARG DATABASE_URL=postgresql://localhost:5432/temp

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
ENV DATABASE_URL=$DATABASE_URL

# Build Next.js app
RUN npm run build

# ================================
# Runner stage
# ================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Copiar build do Next.js e node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "start"]

