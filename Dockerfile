FROM node:20-bookworm

# Install system dependencies (cached unless apt changes)
RUN apt-get update && apt-get install -y \
    postgresql-15 redis-server supervisor wget \
    && rm -rf /var/lib/apt/lists/* \
    && pg_dropcluster --stop 15 main 2>/dev/null || true

# Install Traefik (cached unless Traefik version changes)
RUN wget -O /tmp/traefik.tar.gz https://github.com/traefik/traefik/releases/download/v3.1.0/traefik_v3.1.0_linux_amd64.tar.gz \
    && tar -xzf /tmp/traefik.tar.gz -C /usr/local/bin/ \
    && rm /tmp/traefik.tar.gz \
    && chmod +x /usr/local/bin/traefik

WORKDIR /app

# ──────────────────────────────────────────────────
# Layer 1: Copy only dependency manifests
# These rarely change → npm install is cached
# ──────────────────────────────────────────────────

# workspace-api (needs schema.prisma for prisma generate)
COPY services/workspace-api/package.json services/workspace-api/package.json
COPY services/workspace-api/prisma/schema.prisma services/workspace-api/prisma/schema.prisma
RUN cd services/workspace-api && npm install

# note-api
COPY services/note-api/package.json services/note-api/package.json
RUN cd services/note-api && npm install

# kanban-api
COPY services/kanban-api/package.json services/kanban-api/package.json
RUN cd services/kanban-api && npm install

# auth-service
COPY services/auth-service/package.json services/auth-service/package.json
RUN cd services/auth-service && npm install

# frontend
COPY apps/workspace-web/package.json apps/workspace-web/package.json
RUN cd apps/workspace-web && npm install

# ──────────────────────────────────────────────────
# Layer 2: Frontend build env + source
# Only these files trigger a frontend rebuild
# ──────────────────────────────────────────────────
RUN printf '%s\n' \
  "VITE_API_URL=/ws" \
  "VITE_WS_URL=ws://localhost:8090/ws" \
  "VITE_NOTE_API_URL=/notes" \
  "VITE_KANBAN_API_URL=/kanban" \
  > /app/apps/workspace-web/.env

COPY apps/workspace-web/src ./apps/workspace-web/src
COPY apps/workspace-web/index.html ./apps/workspace-web/
COPY apps/workspace-web/tsconfig.json ./apps/workspace-web/
COPY apps/workspace-web/tsconfig.node.json ./apps/workspace-web/
COPY apps/workspace-web/vite.config.ts ./apps/workspace-web/
COPY apps/workspace-web/tailwind.config.cjs ./apps/workspace-web/
COPY apps/workspace-web/postcss.config.js ./apps/workspace-web/

RUN cd apps/workspace-web && npx vite build

# ──────────────────────────────────────────────────
# Layer 3: Copy all remaining source code
# (services, configs — does NOT trigger frontend rebuild)
# ──────────────────────────────────────────────────
COPY services/ ./services/

# ──────────────────────────────────────────────────
# Layer 5: Config files
# ──────────────────────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY traefik.yml /etc/traefik/traefik.yml
COPY traefik-dynamic.yml /etc/traefik/dynamic.yml
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80 3001 3000 8000 3010 5173 5432 6379

CMD ["/start.sh"]
