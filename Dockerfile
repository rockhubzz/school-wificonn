# Build stage
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

ARG SESSION_SECRET=build-placeholder-not-used-at-runtime
ENV SESSION_SECRET=$SESSION_SECRET

RUN npm run build

# Runtime stage
FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy generated Prisma client and CLI for runtime migrations
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Entrypoint: migrate DB then start the app
COPY --from=builder /app/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 80

CMD ["/app/docker-entrypoint.sh"]
