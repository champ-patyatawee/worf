ALTER TABLE boards ADD COLUMN board_type TEXT NOT NULL DEFAULT 'kanban';
CREATE INDEX IF NOT EXISTS idx_boards_type ON boards(board_type);