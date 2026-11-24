FROM node:22-bookworm-slim AS build
RUN npm i -g pnpm@12.5.1
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @last-lesson/web build && VITE_PLATFORM_URL=/student pnpm --filter @last-lesson/game build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY --from=build /app/game/dist /usr/share/nginx/html/play
EXPOSE 80
