ALTER TABLE tasks ADD COLUMN due_date TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);