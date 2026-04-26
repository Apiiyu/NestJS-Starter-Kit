# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
USER nestjs
EXPOSE 1337
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:1337/api/health/live', r => process.exit(r.statusCode===200?0:1))"
CMD ["node", "dist/main"]
