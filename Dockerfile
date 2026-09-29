# syntax=docker/dockerfile:1.7
#
# Production image for Construction CMS (see DEPLOYMENT.md).
#
#   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://example.com -t construction-cms .
#
# Targets:
#   runner (default)  the web server: node server.js, non-root, ~300 MB
#   tools             full toolchain for migrations and the seed:
#                     docker run --rm --env-file .env.production construction-cms-tools npx prisma migrate deploy

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
# libc6-compat: some native modules expect glibc symbols; openssl: Prisma's migration engine.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Dependencies (cached until package*.json or the schema change) ─────────
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
# Inlined into the build: the public URL is part of the image.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_OUTPUT=standalone
RUN test -n "$NEXT_PUBLIC_SITE_URL" || (echo "Build arg NEXT_PUBLIC_SITE_URL is required" && exit 1)
# No database or secrets are needed to build (pages render on first visit).
RUN npm run build

# ── Tools: migrations and seed ───────────────────────────────────────────────
FROM builder AS tools
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs \
 && mkdir -p /app/storage && chown nextjs:nodejs /app/storage

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
# Local-disk storage (STORAGE_DRIVER=local) lives here; mount a volume.
VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
