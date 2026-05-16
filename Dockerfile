# syntax=docker/dockerfile:1.7

# Stage 1: install all deps (incl. dev) and build native modules (bcrypt).
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build the Next.js standalone bundle.
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: minimal runtime image.
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone server + minimal node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets need to live alongside .next/standalone.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public folder (manifest, icons, service worker).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
