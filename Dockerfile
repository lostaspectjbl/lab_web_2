FROM node:20-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation on Alpine
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application source
COPY . .

# Create writable data directory for SQLite and set ownership for non-root 'node' user
RUN mkdir -p /data && chown -R node:node /app /data

# Run as non-root user
USER node

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

EXPOSE 3000 3001

CMD ["node", "src/server.js"]
