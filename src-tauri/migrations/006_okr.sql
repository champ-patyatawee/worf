CREATE TABLE IF NOT EXISTS okr_objectives (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  progress REAL DEFAULT 0.0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS okr_key_results (
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  initial_value REAL DEFAULT 0.0,
  target_value REAL NOT NULL,
  current_value REAL DEFAULT 0.0,
  unit TEXT,
  confidence INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS board_objectives (
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (board_id, objective_id)
);