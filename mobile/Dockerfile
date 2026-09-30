# syntax=docker/dockerfile:1
#
# Expo dev server for Expo Go on a real phone. Used by the `expo` profile in
# docker-compose.yml. The phone must reach this machine on port 8081, so set
# HOST_IP to the laptop's LAN address.

FROM node:22-bookworm-slim
ENV EXPO_NO_TELEMETRY=1 CI=1
WORKDIR /repo
RUN chown node:node /repo
USER node
COPY --chown=node:node engine/src ./engine/src
COPY --chown=node:node mobile/package.json mobile/package-lock.json ./mobile/
RUN cd mobile && npm ci --no-audit --no-fund
COPY --chown=node:node mobile ./mobile
WORKDIR /repo/mobile
EXPOSE 8081
CMD ["sh", "-c", "if [ -z \"$REACT_NATIVE_PACKAGER_HOSTNAME\" ]; then echo 'Set HOST_IP to this machine LAN address, e.g. HOST_IP=192.168.1.23 docker compose --profile expo up' >&2; exit 1; fi; exec npx expo start --lan --port 8081"]
