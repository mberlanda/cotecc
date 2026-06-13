FROM node:22-alpine AS builder

WORKDIR /app

ENV CI=true \
    HUSKY=0

COPY package.json package-lock.json ./
RUN npm ci

COPY app.json babel.config.js index.js index.web.js metro.config.js tsconfig.json ./
COPY src ./src

RUN npx expo export --platform web --output-dir dist

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1
