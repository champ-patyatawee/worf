-- Migration 002: Notes (Obsidian-like linked Markdown notes)

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled',
    slug TEXT NOT NULL DEFAULT '' UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    folder_id TEXT,
    tags TEXT NOT NULL DEFAULT '',              -- Comma-separated: "tag1,tag2"
    frontmatter TEXT NOT NULL DEFAULT '{}',     -- JSON blob for YAML frontmatter data
    pinned INTEGER NOT NULL DEFAULT 0,          -- 1 = pinned to top
    position INTEGER NOT NULL DEFAULT 0,         -- ordering for drag-and-drop
    word_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS note_links (
    id TEXT PRIMARY KEY NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    link_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_slug ON notes(slug);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes(tags);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_id);