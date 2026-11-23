# codearchy-web

The CodeArchy websites:

| Host | App | What |
|---|---|---|
| `codearchy.com` | [`apps/site`](apps/site) | The marketing site (React + Vite) |
| `app.codearchy.com` | [`apps/app`](apps/app) | The CodeArchy web app: open a folder, a `.zip` or the sample, and see its architecture. Code is analysed in the browser and never uploaded to CodeArchy. Optional AI (chat and summaries) is off by default. When it's on, calls go straight from the browser to the provider the user chooses, within the privacy tier they set. |

The engine and UI come from [CodeArchy/codearchy](https://github.com/CodeArchy/codearchy) (`@codearchy/*` packages). They are not on npm yet. Instead, they're built from the commit pinned in [`codearchy.json`](codearchy.json), which is checked out into `.codearchy/` (git-ignored).

## Develop

Needs Node 22.12+ and pnpm, which comes with Node via `corepack enable`.

```bash
# The web app
pnpm codearchy:fetch        # check out codearchy at the pinned commit
pnpm install
pnpm codearchy:build        # build the @codearchy packages the app uses
pnpm dev:app                # http://localhost:5180

# Changing both repos together: use a local codearchy checkout instead
pnpm dev:link ../codearchy  # symlinks .codearchy, installs, keeps the committed lockfile
pnpm codearchy:build

# The marketing site (keeps its own npm lockfile, built exactly as before)
pnpm dev:site               # or: cd apps/site && npm ci && npm run dev
```

**AI in the web app.** The AI host (`apps/app/src/ai`) runs in the engine worker and loads on first use. API keys are encrypted in IndexedDB under a non-extractable WebCrypto key. Ollama and LM Studio are reached on `localhost`; the settings panel shows the one-time setup with this site's origin (`OLLAMA_ORIGINS`). Providers are only contacted once someone uses AI. The CSP's `connect-src` lists exactly the provider APIs and the two localhost ports.

Tests: `pnpm build:app && pnpm test:app` runs the app in Chromium, Firefox and WebKit. It serves the build with the security headers from `docker/nginx/app-headers.conf`, so the test runs under the CSP that ships.

To move to a newer codearchy: set `commit` in `codearchy.json`, run `pnpm codearchy:fetch && pnpm install`, and commit the lockfile.

## Deploy

One image serves both hosts. nginx picks the site by host name:
- `docker/nginx/app.conf` serves any `app.*` host;
- `docker/nginx/site.conf` is the default server, so every other host gets the marketing site.

```bash
docker build -t codearchy-web .
docker run -p 8080:80 codearchy-web   # http://localhost:8080 (site), http://app.localhost:8080 (app)
```

With Dokploy and Traefik, route both `codearchy.com` and `app.codearchy.com` to this container's port 80. See `docker-compose.yml` and `deploy.sh`.
