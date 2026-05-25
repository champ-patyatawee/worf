#!/bin/bash
set -e

PG_DATA=/var/lib/postgresql/15/main
PG_HBA=$PG_DATA/pg_hba.conf

# Database URLs for Prisma migrations
export DATABASE_URL="postgresql://workspace:workspace_dev@localhost:5432/workspace"
export WORKSPACE_DATABASE_URL="$DATABASE_URL"
export KANBAN_DATABASE_URL="postgresql://workspace:workspace_dev@localhost:5432/kanban"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="${JWT_SECRET:-dev-secret-change-in-prod}"

# Initialize Postgres cluster if not already done
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
    echo ">>> Initializing PostgreSQL cluster..."
    mkdir -p "$PG_DATA"
    chown -R postgres:postgres /var/lib/postgresql 2>/dev/null || true
    su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D $PG_DATA"
    NEED_SETUP=true
else
    NEED_SETUP=false
fi

# Always ensure password auth works
echo ">>> Configuring PostgreSQL auth..."
{
    echo "local all all peer"
    echo "host all all 127.0.0.1/32 scram-sha-256"
    echo "host all all ::1/128 scram-sha-256"
} > "$PG_HBA"
chown postgres:postgres "$PG_HBA" 2>/dev/null || true

# Start Postgres
echo ">>> Starting PostgreSQL..."
su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PG_DATA -l /tmp/pg.log start -w" || {
    cat /tmp/pg.log 2>/dev/null
    echo ">>> Retrying Postgres start..."
    su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PG_DATA -l /tmp/pg.log start -w"
}

# First-time setup: create databases
if [ "$NEED_SETUP" = true ]; then
    echo ">>> Creating databases..."
    su - postgres -c "psql -c \"CREATE USER workspace WITH PASSWORD 'workspace_dev';\"" 2>/dev/null || true
    for db in workspace note kanban; do
        su - postgres -c "psql -c \"CREATE DATABASE $db OWNER workspace;\"" 2>/dev/null || true
        su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $db TO workspace;\"" 2>/dev/null || true
    done
    echo ">>> Enabling pgvector..."
    su - postgres -c "psql -d workspace -c \"CREATE EXTENSION IF NOT EXISTS vector;\"" 2>/dev/null || true
    touch "$PG_DATA/.initialized"
fi

# Run Prisma migrations (Postgres is running)
echo ">>> Running workspace DB migrations..."
cd /app/services/workspace-api
DATABASE_URL="postgresql://workspace:workspace_dev@localhost:5432/workspace" npx prisma db push --accept-data-loss 2>&1 || true

echo ">>> Seeding workspace API..."
DATABASE_URL="postgresql://workspace:workspace_dev@localhost:5432/workspace" npx tsx prisma/seed.ts 2>&1 || true

echo ">>> Running note DB migrations..."
cd /app/services/note-api
DATABASE_URL="postgresql://workspace:workspace_dev@localhost:5432/note" npx prisma db push --accept-data-loss 2>&1 || true
DATABASE_URL="postgresql://workspace:workspace_dev@localhost:5432/note" npx tsx prisma/seed.ts 2>&1 || true

echo ">>> Running kanban DB migrations..."
cd /app/services/kanban-api
KANBAN_DATABASE_URL="postgresql://workspace:workspace_dev@localhost:5432/kanban" npx prisma db push --accept-data-loss 2>&1 || true

# Start all services via supervisor
echo ">>> Starting all services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
