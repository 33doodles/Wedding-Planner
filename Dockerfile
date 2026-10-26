FROM node:22-alpine

WORKDIR /app

# Copy package manifests first for optimal Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY server.js ./
COPY public ./public

# Create persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
