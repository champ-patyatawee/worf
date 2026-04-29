# Worf - Workspace

Chat, Notes, Kanban — all in one place. AI-native workspace with multi-provider support.

## Architecture

| Component | Tech | Port |
|-----------|------|------|
| **workspace-web** | React + Vite + TypeScript | 5173 |
| **workspace-api** | Express + Socket.io + Prisma | 3001 |
| **note-api** | Fastify + Prisma | 3000 |
| **kanban-api** | Fastify + Prisma | 8000 |
| **embedding-worker** | Transformers.js + Redis | — |
| **PostgreSQL** | pgvector/pgvector:pg15 | 5432 |
| **Redis** | redis:7-alpine | 6379 |

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local dev)
- A HuggingFace token (for embedding model)

### Quick Start (all in one)

```bash
docker compose -f docker-compose.dev.yml up -d
```

The app will be available at **http://localhost:5173**.

### Setup

```bash
# 1. Clone and enter the project
cd worf

# 2. (Optional) Set HF_TOKEN in .env for the embedding model (similarity search)
echo "HF_TOKEN=hf_your_token_here" >> .env

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose -f docker-compose.dev.yml up -d postgres redis

# 4. Initialize databases and schemas
docker compose -f docker-compose.dev.yml run --rm workspace-api-init
docker compose -f docker-compose.dev.yml run --rm note-api-init
docker compose -f docker-compose.dev.yml run --rm kanban-api-init

# 5. Start everything
docker compose -f docker-compose.dev.yml up -d
```


### Default Credentials

| Email | Password |
|-------|----------|
| `admin@worf.dev` | `123456` |

## Re-initializing Database

After schema changes or a fresh database volume:

```bash
docker compose -f docker-compose.dev.yml run --rm workspace-api-init
docker compose -f docker-compose.dev.yml run --rm note-api-init
docker compose -f docker-compose.dev.yml run --rm kanban-api-init
```

Or use the helper script:

```bash
./scripts/prisma-push.sh
```

## Environment Variables

Key variables (set in `docker-compose.dev.yml` or `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://workspace:workspace_dev@postgres:5432/workspace` | Workspace DB |
| `JWT_SECRET` | `dev-secret-change-in-prod` | JWT signing key |
| `REDIS_URL` | `redis://redis:6379` | Redis connection |
| `HF_TOKEN` | — | HuggingFace token for embeddings |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |

## Development (without Docker)

Each service can be run locally:

```bash
# workspace-api
cd services/workspace-api
cp .env.example .env
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev

# note-api
cd services/note-api
npm install
npx prisma db push
npm run dev

# kanban-api
cd services/kanban-api
npm install
npx prisma db push
npm run dev

# web
cd apps/workspace-web
npm install
npm run dev
```

## Services

### workspace-api
Team chat with real-time messaging, channels, direct messages, file sharing, AI agents, and terminal access.

### note-api
Rich document editor with folder organization and markdown support.

### kanban-api
Simple Kanban board with task management.

### embedding-worker
Background worker that generates embeddings using Transformers.js for semantic search.
