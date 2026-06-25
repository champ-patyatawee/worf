-- Migration 003: Add position column to folders for drag-and-drop reordering
ALTER TABLE folders ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_folders_position ON folders(position);