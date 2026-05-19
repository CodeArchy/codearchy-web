#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# CodeArchy Web — Deployment Script
#
# Supports two deployment paths:
#   1) Local Docker   — build & run the production container locally
#   2) Hostinger VPS via Dokploy (three sub-modes):
#        a) Webhook URL  — POST to Dokploy's git-provider webhook
#        b) Dokploy API  — call the REST API directly
#        c) SSH          — SSH into VPS and run docker compose
#
# Configuration (via .env or exported env vars):
#   DOKPLOY_WEBHOOK_URL     — Dokploy deploy webhook URL
#   DOKPLOY_URL             — Dokploy base URL (e.g. https://dokploy.example.com)
#   DOKPLOY_API_KEY         — Dokploy API key
#   DOKPLOY_APPLICATION_ID  — Dokploy applicationId
#   VPS_HOST                — VPS IP or hostname
#   VPS_USER                — SSH user (default: root)
#   VPS_SSH_KEY             — Path to SSH private key (default: ~/.ssh/id_rsa)
#   VPS_APP_DIR             — App directory on VPS
#   GIT_REMOTE              — Git remote name (default: origin)
#   GIT_BRANCH              — Git branch to deploy (default: main)
#   APP_PORT                — Host port for the web server (default: 3000)
#   DOMAIN                  — Production domain for display
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

print_info()    { echo -e "${BLUE}ℹ  $1${NC}"; }
print_success() { echo -e "${GREEN}✔  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠  $1${NC}"; }
print_error()   { echo -e "${RED}✖  $1${NC}"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

# ── Preflight ─────────────────────────────────────────────────────────────────
print_info "Checking required tools..."
if ! command_exists docker; then
    print_error "Docker is not installed. Please install it from: https://docs.docker.com/get-docker/"
    exit 1
fi
print_success "Docker is available"

# ── Load .env ─────────────────────────────────────────────────────────────────
_dotenv_get() {
    grep -E "^${1}=" .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//'
}

if [ -f ".env" ]; then
    [ -z "${DOKPLOY_WEBHOOK_URL:-}" ]    && DOKPLOY_WEBHOOK_URL=$(_dotenv_get DOKPLOY_WEBHOOK_URL)
    [ -z "${DOKPLOY_URL:-}" ]            && DOKPLOY_URL=$(_dotenv_get DOKPLOY_URL)
    [ -z "${DOKPLOY_API_KEY:-}" ]        && DOKPLOY_API_KEY=$(_dotenv_get DOKPLOY_API_KEY)
    [ -z "${DOKPLOY_APPLICATION_ID:-}" ] && DOKPLOY_APPLICATION_ID=$(_dotenv_get DOKPLOY_APPLICATION_ID)
    [ -z "${VPS_HOST:-}" ]               && VPS_HOST=$(_dotenv_get VPS_HOST)
    [ -z "${VPS_USER:-}" ]               && VPS_USER=$(_dotenv_get VPS_USER)
    [ -z "${VPS_SSH_KEY:-}" ]            && VPS_SSH_KEY=$(_dotenv_get VPS_SSH_KEY)
    [ -z "${VPS_APP_DIR:-}" ]            && VPS_APP_DIR=$(_dotenv_get VPS_APP_DIR)
    [ -z "${GIT_REMOTE:-}" ]             && GIT_REMOTE=$(_dotenv_get GIT_REMOTE)
    [ -z "${GIT_BRANCH:-}" ]             && GIT_BRANCH=$(_dotenv_get GIT_BRANCH)
    [ -z "${DOMAIN:-}" ]                 && DOMAIN=$(_dotenv_get DOMAIN)
fi

# Defaults
GIT_REMOTE=${GIT_REMOTE:-"origin"}
GIT_BRANCH=${GIT_BRANCH:-"main"}
DOMAIN=${DOMAIN:-"codearchy.dev"}
APP_PORT=${APP_PORT:-"3000"}
VPS_USER=${VPS_USER:-"root"}
VPS_SSH_KEY=${VPS_SSH_KEY:-"$HOME/.ssh/id_rsa"}
VPS_APP_DIR=${VPS_APP_DIR:-"/etc/dokploy/compose/codearchy-web"}

# ── Choose deployment method ──────────────────────────────────────────────────
echo ""
print_info "Select deployment method:"
echo "  1) Local Docker  — build & run production image locally"
echo "  2) Hostinger VPS via Dokploy"
echo ""
read -rp "Enter choice [1-2]: " deploy_choice

# ─────────────────────────────────────────────────────────────────────────────
case "$deploy_choice" in

# ── 1. Local Docker ───────────────────────────────────────────────────────────
1)
    print_info "Building production Docker image..."
    docker build --target production -t codearchy-web:latest .
    print_success "Image built: codearchy-web:latest"

    print_info "Stopping any existing container..."
    docker rm -f codearchy-web 2>/dev/null || true

    print_info "Starting container on port $APP_PORT..."
    docker run -d \
        --name codearchy-web \
        --restart unless-stopped \
        -p "${APP_PORT}:80" \
        codearchy-web:latest

    print_success "Container running at http://localhost:${APP_PORT}"
    ;;

# ── 2. Dokploy ────────────────────────────────────────────────────────────────
2)
    print_info "=== Hostinger VPS Deployment via Dokploy ==="
    echo ""

    # ── Step 1: Push to Git ──────────────────────────────────────────────────
    if command_exists git && [ -d ".git" ]; then
        print_info "Step 1/2 — Pushing latest code to Git ($GIT_REMOTE/$GIT_BRANCH)..."
        if [ -n "$(git status --porcelain)" ]; then
            print_warning "Working tree has uncommitted changes."
            read -rp "Commit & push them now? [y/N]: " confirm_commit
            if [[ "$confirm_commit" =~ ^[Yy]$ ]]; then
                read -rp "Commit message [chore: deploy]: " commit_msg
                commit_msg=${commit_msg:-"chore: deploy"}
                git add -A
                git commit -m "$commit_msg"
            else
                print_warning "Skipping commit — only previously committed code will deploy."
            fi
        fi

        if git remote get-url "$GIT_REMOTE" >/dev/null 2>&1; then
            git push "$GIT_REMOTE" "$GIT_BRANCH" || {
                print_warning "git push failed — continuing with redeploy step."
            }
            print_success "Code pushed to $GIT_REMOTE/$GIT_BRANCH"
        else
            print_warning "Git remote '$GIT_REMOTE' not configured — skipping push."
        fi
    else
        print_warning "Not a git repository — skipping git push."
    fi

    # ── Step 2: Trigger Redeploy ─────────────────────────────────────────────
    echo ""
    print_info "Step 2/2 — Trigger Dokploy redeploy"
    echo "  1) Webhook URL  (DOKPLOY_WEBHOOK_URL)"
    echo "  2) Dokploy API  (DOKPLOY_URL + DOKPLOY_API_KEY + DOKPLOY_APPLICATION_ID)"
    echo "  3) SSH + docker compose (manual / pre-Dokploy fallback)"
    echo "  4) Skip (Dokploy auto-deploy on git push is already configured)"
    read -rp "Enter choice [1-4]: " redeploy_choice

    case "$redeploy_choice" in

    # Webhook
    1)
        if [ -z "${DOKPLOY_WEBHOOK_URL:-}" ]; then
            read -rp "Dokploy deploy webhook URL: " DOKPLOY_WEBHOOK_URL
        fi
        [ -z "${DOKPLOY_WEBHOOK_URL:-}" ] && { print_error "Webhook URL is required."; exit 1; }

        WEBHOOK_PAYLOAD="{\"ref\":\"refs/heads/${GIT_BRANCH}\"}"
        print_info "Calling Dokploy deploy webhook (ref: refs/heads/${GIT_BRANCH})..."
        http_code=$(curl -sS -o /tmp/dokploy_resp.txt -w "%{http_code}" \
            -X POST "$DOKPLOY_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -H "X-GitHub-Event: push" \
            -d "$WEBHOOK_PAYLOAD" || echo "000")

        if [[ "$http_code" =~ ^2 ]]; then
            print_success "Dokploy redeploy triggered (HTTP $http_code)"
        else
            print_error "Webhook call failed (HTTP $http_code)"
            cat /tmp/dokploy_resp.txt 2>/dev/null || true
            print_warning "If response is 'Branch Not Match', verify GIT_BRANCH ('$GIT_BRANCH') matches the branch set in Dokploy → Deploy → Provider."
            exit 1
        fi
        ;;

    # Dokploy API
    2)
        [ -z "${DOKPLOY_URL:-}" ]            && read -rp "Dokploy base URL: " DOKPLOY_URL
        [ -z "${DOKPLOY_API_KEY:-}" ]        && read -rp "Dokploy API key: " DOKPLOY_API_KEY
        [ -z "${DOKPLOY_APPLICATION_ID:-}" ] && read -rp "Dokploy applicationId: " DOKPLOY_APPLICATION_ID

        if [ -z "${DOKPLOY_URL:-}" ] || [ -z "${DOKPLOY_API_KEY:-}" ] || [ -z "${DOKPLOY_APPLICATION_ID:-}" ]; then
            print_error "DOKPLOY_URL, DOKPLOY_API_KEY and DOKPLOY_APPLICATION_ID are all required."
            exit 1
        fi

        print_info "Calling Dokploy API: ${DOKPLOY_URL%/}/api/application.deploy ..."
        http_code=$(curl -sS -o /tmp/dokploy_resp.txt -w "%{http_code}" \
            -X POST "${DOKPLOY_URL%/}/api/application.deploy" \
            -H "Content-Type: application/json" \
            -H "x-api-key: $DOKPLOY_API_KEY" \
            -d "{\"applicationId\":\"$DOKPLOY_APPLICATION_ID\"}" || echo "000")

        if [[ "$http_code" =~ ^2 ]]; then
            print_success "Dokploy redeploy triggered (HTTP $http_code)"
        else
            print_error "Dokploy API call failed (HTTP $http_code)"
            cat /tmp/dokploy_resp.txt 2>/dev/null || true
            exit 1
        fi
        ;;

    # SSH fallback
    3)
        [ -z "${VPS_HOST:-}" ] && read -rp "VPS IP or hostname: " VPS_HOST
        [ -z "${VPS_HOST:-}" ] && { print_error "VPS host is required."; exit 1; }

        if [ ! -f "$VPS_SSH_KEY" ]; then
            print_error "SSH key not found at: $VPS_SSH_KEY"
            exit 1
        fi

        SSH_OPTS="-i $VPS_SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
        print_info "Testing SSH connection to $VPS_USER@$VPS_HOST ..."
        ssh $SSH_OPTS "$VPS_USER@$VPS_HOST" "echo ok" >/dev/null 2>&1 \
            || { print_error "Cannot connect to VPS. Check host, user, and SSH key."; exit 1; }
        print_success "SSH connection OK"

        print_info "Pulling latest code & rebuilding stack on VPS..."
        ssh $SSH_OPTS "$VPS_USER@$VPS_HOST" bash -s <<REMOTE_EOF
set -e
if [ ! -d "$VPS_APP_DIR" ]; then
    echo "App directory $VPS_APP_DIR does not exist."
    exit 1
fi
cd "$VPS_APP_DIR"
if [ -d .git ]; then
    git fetch --all --prune
    git reset --hard "origin/$GIT_BRANCH"
fi
docker compose pull || true
docker compose up -d --build --remove-orphans
docker compose ps
REMOTE_EOF
        print_success "VPS stack rebuilt and restarted"
        ;;

    # Skip
    4)
        print_info "Skipped redeploy — relying on Dokploy git auto-deploy."
        ;;

    *)
        print_error "Invalid choice"
        exit 1
        ;;
    esac

    echo ""
    print_success "Hostinger / Dokploy deployment flow completed!"
    print_info  "Domain: https://$DOMAIN"
    ;;

*)
    print_error "Invalid choice: $deploy_choice"
    exit 1
    ;;
esac

echo ""
print_success "Done."
