import { Pool } from 'pg';

const WORKSPACE_DB = process.env.WORKSPACE_DATABASE_URL || 'postgresql://workspace:workspace_dev@localhost:5432/workspace';

export const workspacePool = new Pool({
  connectionString: WORKSPACE_DB,
});

export async function getWorkspaceAIProviders() {
  const result = await workspacePool.query(
    'SELECT id, name, provider, "apiUrl", model, "isActive", "isDefault" FROM "AIProvider" ORDER BY "createdAt" DESC'
  );
  return result.rows;
}

export async function getWorkspaceAIProvider(id: string) {
  const result = await workspacePool.query(
    'SELECT id, name, provider, "apiUrl", "apiKey", model, "isActive", "isDefault" FROM "AIProvider" WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getDefaultWorkspaceAIProvider() {
  const result = await workspacePool.query(
    'SELECT id, name, provider, "apiUrl", "apiKey", model, "isActive", "isDefault" FROM "AIProvider" WHERE "isActive" = true AND "isDefault" = true LIMIT 1'
  );
  if (result.rows[0]) return result.rows[0];
  
  const fallback = await workspacePool.query(
    'SELECT id, name, provider, "apiUrl", "apiKey", model, "isActive", "isDefault" FROM "AIProvider" WHERE "isActive" = true LIMIT 1'
  );
  return fallback.rows[0] || null;
}
