# Build the SPA, then serve it from nginx. The image carries no Node runtime:
# the output is static files plus a proxy that forwards /api, /healthz and
# /metrics to a cluster-guardian instance.
FROM node:26-alpine AS build
WORKDIR /app

# Copy the manifests first so `npm ci` is cached until a dependency changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# nginx-unprivileged, not stock nginx: it already runs as uid 101, listens on
# 8080, and keeps its pid and temp paths under /tmp. Stock nginx cannot start
# as non-root with a read-only root filesystem — it fails opening /run/nginx.pid
# — and its /etc/nginx/conf.d is root-owned, so the template entrypoint silently
# skips rendering. Both were verified before choosing this base.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# CG_UPSTREAM is substituted into the proxy config at container start, so one
# image works against any backend address.
ENV CG_UPSTREAM=http://cluster-guardian:8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# The entrypoint renders /etc/nginx/templates/*.template with envsubst before
# starting, so no custom entrypoint is needed. Note that it writes the result
# into /etc/nginx/conf.d, which must stay writable under a read-only root — see
# deploy/README.md.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
