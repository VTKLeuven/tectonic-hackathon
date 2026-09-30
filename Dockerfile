# syntax=docker/dockerfile:1
#
# The demo in one image: the Kate Radar website at /, and the KBC Mobile
# prototype (Expo, exported for web) at /app. Both are static files served by
# an unprivileged nginx. The shared engine is compiled into both bundles.

ARG NODE_IMAGE=node:22-bookworm-slim

# ---- The Expo app, exported as a static web app under /app ----
FROM ${NODE_IMAGE} AS app
WORKDIR /repo
COPY engine/src ./engine/src
COPY mobile/package.json mobile/package-lock.json ./mobile/
RUN cd mobile && npm ci --no-audit --no-fund
COPY mobile ./mobile
RUN cd mobile && EXPO_BASE_URL=/app EXPO_NO_TELEMETRY=1 npx expo export --platform web --output-dir dist

# ---- The demo website ----
FROM ${NODE_IMAGE} AS web
WORKDIR /repo
COPY engine/src ./engine/src
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci --no-audit --no-fund
COPY web ./web
RUN cd web && npm run build

# ---- Runtime: static files only, no Node, no root ----
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=web /repo/web/dist /usr/share/nginx/html
COPY --from=app /repo/mobile/dist /usr/share/nginx/html/app
# LAN address of the machine running `docker compose --profile expo`, for the Expo Go QR code.
ENV HOST_IP=""
EXPOSE 8080
