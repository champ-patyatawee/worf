use rusqlite::{Connection, Result};
use std::path::Path;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn new(app_dir: &Path) -> Result<Self> {
        let db_path = app_dir.join("worf.db");
        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
conn.execute_batch("PRAGMA foreign_keys=ON;")?;
        conn.execute_batch(include_str!("../migrations/001_init.sql"))?;
        conn.execute_batch(include_str!("../migrations/002_notes.sql"))?;

        // Migration 002b: Add position column to existing notes/folders tables
        // ALTER TABLE runs HERE — safe because execute_batch for 002 already succeeded.
        // If the column already exists (new DB), ALTER TABLE fails but .ok() ignores it.
        // If the column doesn't exist (existing DB), ALTER TABLE adds it.
        // (Must run BEFORE CREATE INDEX so the column will exist when we index it.)
        conn.execute_batch("ALTER TABLE notes ADD COLUMN position INTEGER NOT NULL DEFAULT 0").ok();
        conn.execute_batch("ALTER TABLE folders ADD COLUMN position INTEGER NOT NULL DEFAULT 0").ok();

        // Now create the index — column definitely exists by this point
        conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_notes_position ON notes(position)")?;

        // Migration 003 may fail on existing databases (position already added above)
        conn.execute_batch(include_str!("../migrations/003_folders_position.sql")).ok();

        // Migration 004: Add due_date to tasks
        conn.execute_batch(include_str!("../migrations/004_dates.sql")).ok();

        // Migration 005: Sprints
        conn.execute_batch(include_str!("../migrations/005_sprints.sql")).ok();

        // Migration 006: OKRs
        conn.execute_batch(include_str!("../migrations/006_okr.sql")).ok();

        // Migration 007: board_type for project routing
        conn.execute_batch(include_str!("../migrations/007_board_type.sql")).ok();

        println!("Database initialized at: {:?}", db_path);
        Ok(Database { conn })
    }

    #[cfg(test)]
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;
        conn.execute_batch(include_str!("../migrations/001_init.sql"))?;
        conn.execute_batch(include_str!("../migrations/002_notes.sql"))?;

        // Migration 002b: Add position column to existing notes/folders tables
        // ALTER TABLE runs HERE — safe because execute_batch for 002 already succeeded.
        // If the column already exists (new DB), ALTER TABLE fails but .ok() ignores it.
        // If the column doesn't exist (existing DB), ALTER TABLE adds it.
        // (Must run BEFORE CREATE INDEX so the column will exist when we index it.)
        conn.execute_batch("ALTER TABLE notes ADD COLUMN position INTEGER NOT NULL DEFAULT 0").ok();
        conn.execute_batch("ALTER TABLE folders ADD COLUMN position INTEGER NOT NULL DEFAULT 0").ok();

        // Now create the index — column definitely exists by this point
        conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_notes_position ON notes(position)")?;

        // Migration 003 may fail on existing databases (position already added above)
        conn.execute_batch(include_str!("../migrations/003_folders_position.sql")).ok();

        // Migration 004: Add due_date to tasks
        conn.execute_batch(include_str!("../migrations/004_dates.sql")).ok();

        // Migration 005: Sprints
        conn.execute_batch(include_str!("../migrations/005_sprints.sql")).ok();

        // Migration 006: OKRs
        conn.execute_batch(include_str!("../migrations/006_okr.sql")).ok();

        // Migration 007: board_type for project routing
        conn.execute_batch(include_str!("../migrations/007_board_type.sql")).ok();

        Ok(Database { conn })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> Database {
        Database::new_in_memory().expect("Failed to create in-memory database")
    }

    #[test]
    fn test_create_and_list_boards() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let board_id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO boards (id, name, slug, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![board_id, "Test Board", "test-board", now, now],
            )
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM boards", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_create_and_list_tasks() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let board_id = uuid::Uuid::new_v4().to_string();

        // Create a board first (foreign key constraint)
        db.conn
            .execute(
                "INSERT INTO boards (id, name, slug, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![board_id, "Board", "board", now, now],
            )
            .unwrap();

        let task_id = uuid::Uuid::new_v4().to_string();
        db.conn
            .execute(
                "INSERT INTO tasks (id, title, status, position, board_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![task_id, "Test Task", "todo", 0, board_id, now, now],
            )
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_create_ai_provider() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let provider_id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO ai_providers (id, name, provider, api_url, api_key, model, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![provider_id, "Test", "openai", "https://api.openai.com/v1", "sk-test", "gpt-4o", now, now],
            )
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM ai_providers", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_foreign_key_cascade_delete_board() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let board_id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO boards (id, name, slug, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![board_id, "Board", "board", now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO tasks (id, title, status, position, board_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Task", "todo", 0, board_id, now, now],
            )
            .unwrap();

        // Delete board (should cascade delete tasks)
        db.conn
            .execute("DELETE FROM boards WHERE id = ?1", rusqlite::params![board_id])
            .unwrap();

        let task_count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(task_count, 0, "Tasks should be cascade-deleted with board");
    }

    #[test]
    fn test_settings_key_value() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO settings (id, key, value, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![id, "note_ai_provider_id", "provider-123", now, now],
            )
            .unwrap();

        let value: String = db
            .conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["note_ai_provider_id"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(value, "provider-123");
    }

    #[test]
    fn test_create_board_with_three_tasks() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let board_id = uuid::Uuid::new_v4().to_string();

        // Create board
        db.conn
            .execute(
                "INSERT INTO boards (id, name, slug, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![board_id, "Sprint 12", "sprint-12", now, now],
            )
            .unwrap();

        // Create 3 tasks with different statuses and priorities
        let tasks = vec![
            ("Design login page", "todo", "high", 0),
            ("Implement API", "in_progress", "medium", 0),
            ("Write tests", "done", "low", 0),
        ];

        for (title, status, priority, position) in &tasks {
            db.conn
                .execute(
                    "INSERT INTO tasks (id, title, description, priority, status, position, board_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    rusqlite::params![
                        uuid::Uuid::new_v4().to_string(),
                        title,
                        "",
                        priority,
                        status,
                        position,
                        board_id,
                        now,
                        now,
                    ],
                )
                .unwrap();
        }

        // Verify board exists
        let board_name: String = db
            .conn
            .query_row(
                "SELECT name FROM boards WHERE id = ?1",
                rusqlite::params![board_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(board_name, "Sprint 12");

        // Verify 3 tasks exist for this board
        let task_count: i64 = db
            .conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE board_id = ?1",
                rusqlite::params![board_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(task_count, 3, "Board should have exactly 3 tasks");

        // Verify each task by title
        for (title, status, priority, _) in &tasks {
            let task_status: String = db
                .conn
                .query_row(
                    "SELECT status FROM tasks WHERE title = ?1 AND board_id = ?2",
                    rusqlite::params![title, board_id],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(
                task_status, *status,
                "Task '{}' should have status '{}'",
                title, status
            );

            let task_priority: String = db
                .conn
                .query_row(
                    "SELECT priority FROM tasks WHERE title = ?1 AND board_id = ?2",
                    rusqlite::params![title, board_id],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(
                task_priority, *priority,
                "Task '{}' should have priority '{}'",
                title, priority
            );
        }

        // Verify tasks span all 3 statuses
        let statuses: Vec<String> = db
            .conn
            .prepare("SELECT DISTINCT status FROM tasks WHERE board_id = ?1 ORDER BY status")
            .unwrap()
            .query_map(rusqlite::params![board_id], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(statuses.len(), 3, "Tasks should span all 3 status columns");
        assert!(statuses.contains(&"todo".to_string()));
        assert!(statuses.contains(&"in_progress".to_string()));
        assert!(statuses.contains(&"done".to_string()));
    }

    use crate::commands::notes::Note;

    #[test]
    fn test_create_note() {
        let db = setup();
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![id, "Test Note", "test-note", "Hello world", None::<String>, "", "{}", 0, 0, 2, now, now],
            )
            .unwrap();
        let note: Note = db.conn.query_row(
            "SELECT id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at FROM notes WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    slug: row.get(2)?,
                    content: row.get(3)?,
                    folder_id: row.get(4)?,
                    tags: row.get(5)?,
                    frontmatter: row.get(6)?,
                    pinned: row.get(7)?,
                    position: row.get(8)?,
                    word_count: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        )
        .unwrap();
        assert_eq!(note.title, "Test Note");
        assert_eq!(note.slug, "test-note");
        assert_eq!(note.word_count, 2);
    }

    #[test]
    fn test_create_and_list_notes() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let id1 = uuid::Uuid::new_v4().to_string();
        let id2 = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![id1, "Note A", "note-a", "Content A", None::<String>, "tag1", "{}", 0, 0, 2, now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![id2, "Note B", "note-b", "Content B", None::<String>, "tag2", "{}", 0, 0, 2, now, now],
            )
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_note_slug_uniqueness() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();

        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "My Note", "my-note", "", None::<String>, "", "{}", 0, 0, 0, now, now],
            )
            .unwrap();

        // Second insert with same slug should fail (UNIQUE constraint)
        let result = db.conn.execute(
            "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            rusqlite::params![uuid::Uuid::new_v4().to_string(), "My Note", "my-note", "", None::<String>, "", "{}", 0, 0, 0, now, now],
        );
        assert!(result.is_err(), "Duplicate slug should be rejected");
    }

    #[test]
    fn test_update_note_content_recalculates_word_count() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![id, "Note", "note", "hello world", None::<String>, "", "{}", 0, 0, 2, now, now],
            )
            .unwrap();

        // Update content
        let new_content = "one two three four five";
        let new_count = new_content.split_whitespace().count() as i32;
        db.conn
            .execute(
                "UPDATE notes SET content = ?1, word_count = ?2, updated_at = ?3 WHERE id = ?4",
                rusqlite::params![new_content, new_count, now, id],
            )
            .unwrap();

        let word_count: i32 = db
            .conn
            .query_row("SELECT word_count FROM notes WHERE id = ?1", rusqlite::params![id], |row| row.get(0))
            .unwrap();
        assert_eq!(word_count, 5);
    }

    #[test]
    fn test_pin_and_unpin_note() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![id, "Note", "note", "", None::<String>, "", "{}", 0, 0, 0, now, now],
            )
            .unwrap();

        // Pin
        db.conn
            .execute(
                "UPDATE notes SET pinned = 1, updated_at = ?1 WHERE id = ?2",
                rusqlite::params![now, id],
            )
            .unwrap();
        let pinned: i32 = db
            .conn
            .query_row("SELECT pinned FROM notes WHERE id = ?1", rusqlite::params![id], |row| row.get(0))
            .unwrap();
        assert_eq!(pinned, 1);

        // Unpin
        db.conn
            .execute(
                "UPDATE notes SET pinned = 0, updated_at = ?1 WHERE id = ?2",
                rusqlite::params![now, id],
            )
            .unwrap();
        let pinned: i32 = db
            .conn
            .query_row("SELECT pinned FROM notes WHERE id = ?1", rusqlite::params![id], |row| row.get(0))
            .unwrap();
        assert_eq!(pinned, 0);
    }

    #[test]
    fn test_note_links_created_on_insert() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let src_id = uuid::Uuid::new_v4().to_string();
        let tgt_id = uuid::Uuid::new_v4().to_string();

        // Insert target note
        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![tgt_id, "Target", "target", "", None::<String>, "", "{}", 0, 0, 0, now, now],
            )
            .unwrap();
        // Insert source note
        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![src_id, "Source", "source", "", None::<String>, "", "{}", 0, 0, 0, now, now],
            )
            .unwrap();

        // Create a note_link
        let link_id = uuid::Uuid::new_v4().to_string();
        db.conn
            .execute(
                "INSERT INTO note_links (id, source_id, target_id, link_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![link_id, src_id, tgt_id, "see target", now],
            )
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM note_links", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_note_links_deleted_on_cascade() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let src_id = uuid::Uuid::new_v4().to_string();
        let tgt_id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![tgt_id, "Target", "target", "", None::<String>, "", "{}", 0, 0, 0, now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![src_id, "Source", "source", "", None::<String>, "", "{}", 0, 0, 0, now, now],
            )
            .unwrap();

        let link_id = uuid::Uuid::new_v4().to_string();
        db.conn
            .execute(
                "INSERT INTO note_links (id, source_id, target_id, link_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![link_id, src_id, tgt_id, "link", now],
            )
            .unwrap();

        // Delete source note — link should cascade
        db.conn
            .execute("DELETE FROM notes WHERE id = ?1", rusqlite::params![src_id])
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM note_links", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0, "note_links should cascade-delete when source note is deleted");
    }

    #[test]
    fn test_search_notes_by_title() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();

        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Rust Programming", "rust-programming", "Learning Rust", None::<String>, "", "{}", 0, 0, 2, now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Python Basics", "python-basics", "Learning Python", None::<String>, "", "{}", 0, 0, 2, now, now],
            )
            .unwrap();

        // Search for "Rust" in title
        let pattern = "%Rust%";
        let count: i64 = db
            .conn
            .query_row(
                "SELECT COUNT(*) FROM notes WHERE title LIKE ?1 OR content LIKE ?1",
                rusqlite::params![pattern],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_search_notes_by_content() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();

        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Note A", "note-a", "This is about algorithms", None::<String>, "", "{}", 0, 0, 4, now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Note B", "note-b", "This is about data structures", None::<String>, "", "{}", 0, 0, 4, now, now],
            )
            .unwrap();

        // Search for "algorithms" in content
        let pattern = "%algorithms%";
        let count: i64 = db
            .conn
            .query_row(
                "SELECT COUNT(*) FROM notes WHERE title LIKE ?1 OR content LIKE ?1",
                rusqlite::params![pattern],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_move_note_between_folders() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let folder_a = uuid::Uuid::new_v4().to_string();
        let folder_b = uuid::Uuid::new_v4().to_string();
        let note_id = uuid::Uuid::new_v4().to_string();
        let content = "This is a test note for folder move";

        // Create two folders
        db.conn
            .execute(
                "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![folder_a, "Folder A", now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![folder_b, "Folder B", now, now],
            )
            .unwrap();

        // Create note in folder_a
        db.conn
            .execute(
                "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![note_id, "Move Test", "move-test", content, &folder_a, "", "{}", 0, 0, 7, now, now],
            )
            .unwrap();

        // Verify note is in folder_a
        let initial_folder: Option<String> = db
            .conn
            .query_row(
                "SELECT folder_id FROM notes WHERE id = ?1",
                rusqlite::params![note_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(initial_folder, Some(folder_a.clone()));

        // Move note to folder_b
        db.conn
            .execute(
                "UPDATE notes SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![folder_b, now, note_id],
            )
            .unwrap();

        // Verify folder_id changed
        let moved_folder: Option<String> = db
            .conn
            .query_row(
                "SELECT folder_id FROM notes WHERE id = ?1",
                rusqlite::params![note_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(moved_folder, Some(folder_b));
    }

    #[test]
    fn test_get_graph_data() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let id_a = uuid::Uuid::new_v4().to_string();
        let id_b = uuid::Uuid::new_v4().to_string();
        let id_c = uuid::Uuid::new_v4().to_string();

        // Create 3 notes
        for (id, title, slug) in &[(id_a.as_str(), "Note A", "note-a"), (id_b.as_str(), "Note B", "note-b"), (id_c.as_str(), "Note C", "note-c")] {
            db.conn
                .execute(
                    "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                    rusqlite::params![id, title, slug, "Content", None::<String>, "", "{}", 0, 0, 1, now, now],
                )
                .unwrap();
        }

        // Create edges: A -> B, B -> C
        let link1_id = uuid::Uuid::new_v4().to_string();
        db.conn
            .execute(
                "INSERT INTO note_links (id, source_id, target_id, link_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![link1_id, id_a, id_b, "Note B", now],
            )
            .unwrap();
        let link2_id = uuid::Uuid::new_v4().to_string();
        db.conn
            .execute(
                "INSERT INTO note_links (id, source_id, target_id, link_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![link2_id, id_b, id_c, "Note C", now],
            )
            .unwrap();

        // Query all notes
        let node_count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))
            .unwrap();
        assert_eq!(node_count, 3, "Graph should have 3 nodes");

        // Query all edges
        let edge_count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM note_links", [], |row| row.get(0))
            .unwrap();
        assert_eq!(edge_count, 2, "Graph should have 2 edges");
    }

    #[test]
    fn test_board_slug_uniqueness() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();

        // Insert two boards with different slugs
        db.conn
            .execute(
                "INSERT INTO boards (id, name, slug, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Board 1", "my-board", now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO boards (id, name, slug, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Board 2", "other-board", now, now],
            )
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM boards", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    
}
