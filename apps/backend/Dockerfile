FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && npm i -g pnpm@12.5.1
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && npx prisma generate --schema prisma/schema.prisma && pnpm build:packages && pnpm --filter @last-lesson/backend build

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node apps/backend/dist/main.js"]
