#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "=== workspace-api ==="
docker compose -f docker-compose.dev.yml run --rm workspace-api-init

echo "=== note-api ==="
docker compose -f docker-compose.dev.yml run --rm note-api-init

echo "=== kanban-api ==="
docker compose -f docker-compose.dev.yml run --rm kanban-api-init

echo ""
echo "All schemas pushed and seeded."
