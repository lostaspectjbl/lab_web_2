# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Native build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Create data dir for SQLite database
RUN mkdir -p /data && chown node:node /data

# Copy installed modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY --chown=node:node . .

# Run as non-root
USER node

# Runtime environment defaults (all overridable via docker-compose / -e flags)
ENV NODE_ENV=production \
    PORT=3000 \
    HELPER_PORT=3001 \
    HELPER_HOST=http://localhost:3001 \
    DATA_DIR=/data

EXPOSE 3000 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
