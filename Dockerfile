# syntax=docker/dockerfile:1

# Imagen de producción de Ordiva (modo real, con PostgreSQL).
# Targets:
#   runner   → servidor Next.js (standalone), usuario sin privilegios.
#   migrator → aplica las migraciones (y opcionalmente el seed) y termina.
# Uso habitual: `docker compose --profile full up -d --build` (ver README).

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencias (incluye las de desarrollo: build, Prisma CLI y tsx para el seed).
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prisma generate` no necesita conexión; el build tampoco toca la base.
RUN npx prisma generate && npm run build

FROM builder AS migrator
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED\" = \"1\" ]; then npx prisma db seed; fi"]

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
