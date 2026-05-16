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
# Ensure drizzle/ exists so the runner COPY succeeds even before any
# migrations have been generated.
RUN mkdir -p drizzle
RUN npm run build

# Stage 3: minimal runtime image with migration tooling.
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone server + minimal runtime node_modules (includes drizzle-orm).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Drizzle migration support: config + schema + generated migrations.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/db/schema.ts ./src/db/schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# drizzle-kit is a dev dep not present in the standalone bundle. Install it
# (plus tsx + typescript to load drizzle.config.ts) on top of the runtime
# node_modules so `npx drizzle-kit migrate` works inside the image.
RUN npm install --no-save --no-fund --no-audit --omit=optional \
      drizzle-kit@^0.31 \
      tsx@^4 \
      typescript@^5 \
 && chown -R nextjs:nodejs /app/node_modules

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
