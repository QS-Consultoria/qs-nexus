# QS Nexus - Production Dockerfile para Heroku

FROM node:20-alpine AS base

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ================================
# Dependencies stage
# ================================
FROM base AS deps

# Copiar apenas package files para cache otimizado
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci --prefer-offline --no-audit

# ================================
# Builder stage
# ================================
FROM base AS builder

# Copiar node_modules da stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar apenas os arquivos necessários para o build
COPY package.json package-lock.json ./
COPY tsconfig.json next.config.mjs postcss.config.js tailwind.config.js ./
COPY components.json drizzle.config.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY hooks ./hooks
COPY types ./types
COPY middleware.ts ./
COPY public ./public

# Build args
ARG DATABASE_URL=postgresql://localhost:5432/temp

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production

# Build Next.js app
RUN npm run build

# ================================
# Runner stage - Imagem mínima para produção
# ================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar apenas dependências de produção
COPY --from=deps /app/node_modules ./node_modules

# Copiar arquivos essenciais
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Copiar lib para migrations e services
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Copiar build do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]

