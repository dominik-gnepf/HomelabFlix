# Multi-stage build for HomelabFlix

# Stage 1: Build server
FROM node:20-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
COPY packages/ ../packages/

RUN npm run build
RUN npm run db:generate

# Stage 2: Build client  
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
COPY packages/ ../packages/

ENV NEXT_PUBLIC_API_URL=http://localhost:3001
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Install Prisma client
COPY server/prisma ./server/prisma
RUN cd server && npx prisma generate

# Copy built server
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/prisma ./server/prisma

# Copy built client
COPY --from=client-builder /app/client/.next ./client/.next
COPY --from=client-builder /app/client/node_modules ./client/node_modules
COPY --from=client-builder /app/client/package.json ./client/
COPY --from=client-builder /app/client/public ./client/public 2>/dev/null || true

# Copy startup script
COPY docker/start.sh ./
RUN chmod +x start.sh

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

CMD ["./start.sh"]
