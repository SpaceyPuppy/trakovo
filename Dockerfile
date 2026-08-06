# syntax=docker/dockerfile:1

FROM node:20-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_MAPBOX_TOKEN=
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 trakovo \
  && adduser --system --uid 1001 trakovo

COPY --from=builder --chown=trakovo:trakovo /app/public ./public
COPY --from=builder --chown=trakovo:trakovo /app/.next/standalone ./
COPY --from=builder --chown=trakovo:trakovo /app/.next/static ./.next/static
COPY --from=builder --chown=trakovo:trakovo /app/prisma ./prisma
COPY --from=builder --chown=trakovo:trakovo /app/database ./database
COPY --from=builder --chown=trakovo:trakovo /app/tools ./tools

# Next's file tracing bundles mysql2 into server route chunks, but the migration
# utility runs as a standalone Node process and needs the driver explicitly.
COPY --from=dependencies /app/node_modules/mysql2 ./node_modules/mysql2
COPY --from=dependencies /app/node_modules/aws-ssl-profiles ./node_modules/aws-ssl-profiles
COPY --from=dependencies /app/node_modules/denque ./node_modules/denque
COPY --from=dependencies /app/node_modules/generate-function ./node_modules/generate-function
COPY --from=dependencies /app/node_modules/iconv-lite ./node_modules/iconv-lite
COPY --from=dependencies /app/node_modules/is-property ./node_modules/is-property
COPY --from=dependencies /app/node_modules/long ./node_modules/long
COPY --from=dependencies /app/node_modules/lru.min ./node_modules/lru.min
COPY --from=dependencies /app/node_modules/named-placeholders ./node_modules/named-placeholders
COPY --from=dependencies /app/node_modules/safer-buffer ./node_modules/safer-buffer
COPY --from=dependencies /app/node_modules/sql-escaper ./node_modules/sql-escaper

RUN mkdir -p /app/uploads \
  && chown -R trakovo:trakovo /app/uploads

USER trakovo
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
