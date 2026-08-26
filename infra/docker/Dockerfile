# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json tsconfig*.json ./
COPY packages/ ./packages/
COPY adapters/ ./adapters/
COPY apps/ ./apps/
COPY cli/ ./cli/
COPY skills/ ./skills/

RUN npm install
RUN npm run build

# Stage 2: Minimal Production Image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV MEMORYAI_DATA_DIR=/var/lib/memoryai
ENV PORT=3000

# Create non-root user and group
RUN addgroup -g 10001 -S memoryai && \
    adduser -u 10001 -S memoryai -G memoryai && \
    mkdir -p /var/lib/memoryai && \
    chown -R memoryai:memoryai /var/lib/memoryai /app

# Copy production artifacts
COPY --from=builder --chown=memoryai:memoryai /app/package*.json ./
COPY --from=builder --chown=memoryai:memoryai /app/node_modules ./node_modules
COPY --from=builder --chown=memoryai:memoryai /app/packages ./packages
COPY --from=builder --chown=memoryai:memoryai /app/adapters ./adapters
COPY --from=builder --chown=memoryai:memoryai /app/apps ./apps
COPY --from=builder --chown=memoryai:memoryai /app/cli ./cli
COPY --from=builder --chown=memoryai:memoryai /app/skills ./skills

# Switch to non-root user
USER memoryai:memoryai

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health/live || exit 1

CMD ["node", "cli/dist/bin.js", "start"]
