# ──────────────────────────────────────────────────────────────
# CodeArchy Web: one image, two sites, chosen by host name
#
#   codearchy.com, www, any other host   the marketing site (apps/site),
#                                        built exactly as before (npm, Node 20)
#   app.*  (app.codearchy.com)           the web app (apps/app), built from the
#                                        codearchy commit pinned in codearchy.json
#
# nginx: docker/nginx/site.conf (default server) and app.conf (+ app-headers.conf).
# ──────────────────────────────────────────────────────────────

# ── Marketing site (unchanged build) ──────────────────────────
FROM node:20-alpine AS site
WORKDIR /site
COPY apps/site/package*.json ./
RUN npm ci --prefer-offline
COPY apps/site/ ./
RUN npm run build

# ── Web app ───────────────────────────────────────────────────
FROM node:22-alpine AS app
RUN apk add --no-cache git
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /web
# The @codearchy/* packages come from the pinned codearchy commit (not npm, yet).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml codearchy.json ./
COPY scripts ./scripts
RUN node scripts/codearchy.mjs fetch
COPY apps/app/package.json ./apps/app/
RUN pnpm install --frozen-lockfile
COPY apps/app ./apps/app
RUN pnpm build:app

# ── Production: nginx serving both ────────────────────────────
FROM nginx:1.27-alpine AS production
RUN rm /etc/nginx/conf.d/default.conf && mkdir -p /etc/nginx/snippets
COPY docker/nginx/site.conf /etc/nginx/conf.d/site.conf
COPY docker/nginx/app.conf /etc/nginx/conf.d/app.conf
COPY docker/nginx/app-headers.conf /etc/nginx/snippets/app-headers.conf
COPY --from=site /site/dist /usr/share/nginx/site
COPY --from=app /web/apps/app/dist /usr/share/nginx/app

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
