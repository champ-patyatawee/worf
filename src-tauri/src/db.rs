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
        println!("Database initialized at: {:?}", db_path);
        Ok(Database { conn })
    }

    #[cfg(test)]
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;
        conn.execute_batch(include_str!("../migrations/001_init.sql"))?;
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
    fn test_create_and_list_folders() {
        let db = setup();
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        db.conn
            .execute(
                "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![id, "Test Folder", now, now],
            )
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM folders", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);

        let name: String = db
            .conn
            .query_row(
                "SELECT name FROM folders WHERE id = ?1",
                rusqlite::params![id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(name, "Test Folder");
    }

    #[test]
    fn test_create_and_list_pages() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let page_id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO pages (id, title, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![page_id, "Test Page", "test-page", "{}", now, now],
            )
            .unwrap();

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM pages", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);

        let title: String = db
            .conn
            .query_row(
                "SELECT title FROM pages WHERE id = ?1",
                rusqlite::params![page_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(title, "Test Page");
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

    // ── Page & Folder tests ──

    #[test]
    fn test_create_folder() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![id, "My Folder", now, now],
            )
            .unwrap();

        let name: String = db.conn
            .query_row("SELECT name FROM folders WHERE id = ?1", rusqlite::params![id], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "My Folder");
    }

    #[test]
    fn test_rename_folder() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![id, "Old Name", now, now],
            )
            .unwrap();

        db.conn
            .execute(
                "UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params!["New Name", now, id],
            )
            .unwrap();

        let name: String = db.conn
            .query_row("SELECT name FROM folders WHERE id = ?1", rusqlite::params![id], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "New Name");
    }

    #[test]
    fn test_create_page_in_folder() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let folder_id = uuid::Uuid::new_v4().to_string();
        let page_id = uuid::Uuid::new_v4().to_string();

        // Create folder
        db.conn
            .execute(
                "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![folder_id, "Folder", now, now],
            )
            .unwrap();

        // Create page in folder
        db.conn
            .execute(
                "INSERT INTO pages (id, title, slug, content, folder_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![page_id, "My Page", "my-page", "{}", folder_id, now, now],
            )
            .unwrap();

        // Verify page exists in folder
        let page_count: i64 = db.conn
            .query_row("SELECT COUNT(*) FROM pages WHERE folder_id = ?1", rusqlite::params![folder_id], |row| row.get(0))
            .unwrap();
        assert_eq!(page_count, 1);

        // Verify title
        let title: String = db.conn
            .query_row("SELECT title FROM pages WHERE id = ?1", rusqlite::params![page_id], |row| row.get(0))
            .unwrap();
        assert_eq!(title, "My Page");
    }

    #[test]
    fn test_page_slug_uniqueness() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();

        // Create two pages with different slugs
        db.conn
            .execute(
                "INSERT INTO pages (id, title, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Page 1", "my-page", "{}", now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO pages (id, title, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![uuid::Uuid::new_v4().to_string(), "Page 2", "other-page", "{}", now, now],
            )
            .unwrap();

        let count: i64 = db.conn
            .query_row("SELECT COUNT(*) FROM pages", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_page_title_update_changes_slug() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let page_id = uuid::Uuid::new_v4().to_string();

        // Create page with initial title
        db.conn
            .execute(
                "INSERT INTO pages (id, title, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![page_id, "Initial Title", "initial-title", "{}", now, now],
            )
            .unwrap();

        // Update title (simulates what update_page command does)
        let new_title = "Updated Title";
        let new_slug = new_title.to_lowercase().replace(' ', "-");
        db.conn
            .execute(
                "UPDATE pages SET title = ?1, slug = ?2, updated_at = ?3 WHERE id = ?4",
                rusqlite::params![new_title, new_slug, now, page_id],
            )
            .unwrap();

        // Verify slug changed
        let slug: String = db.conn
            .query_row("SELECT slug FROM pages WHERE id = ?1", rusqlite::params![page_id], |row| row.get(0))
            .unwrap();
        assert_eq!(slug, "updated-title");

        let title: String = db.conn
            .query_row("SELECT title FROM pages WHERE id = ?1", rusqlite::params![page_id], |row| row.get(0))
            .unwrap();
        assert_eq!(title, "Updated Title");
    }

    #[test]
    fn test_list_pages_in_folder() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let folder_id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![folder_id, "Folder", now, now],
            )
            .unwrap();

        // Create 3 pages in folder
        for i in 1..=3 {
            db.conn
                .execute(
                    "INSERT INTO pages (id, title, slug, content, folder_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    rusqlite::params![uuid::Uuid::new_v4().to_string(), format!("Page {}", i), format!("page-{}", i), "{}", folder_id, now, now],
                )
                .unwrap();
        }

        let count: i64 = db.conn
            .query_row("SELECT COUNT(*) FROM pages WHERE folder_id = ?1", rusqlite::params![folder_id], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_delete_folder_sets_page_folder_null() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let folder_id = uuid::Uuid::new_v4().to_string();
        let page_id = uuid::Uuid::new_v4().to_string();

        db.conn
            .execute(
                "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![folder_id, "Folder", now, now],
            )
            .unwrap();
        db.conn
            .execute(
                "INSERT INTO pages (id, title, slug, content, folder_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![page_id, "Page", "page", "{}", folder_id, now, now],
            )
            .unwrap();

        // Delete folder (pages.folder_id becomes NULL via ON DELETE SET NULL)
        db.conn
            .execute("DELETE FROM folders WHERE id = ?1", rusqlite::params![folder_id])
            .unwrap();

        // Verify page still exists but folder_id is NULL
        let page_count: i64 = db.conn
            .query_row("SELECT COUNT(*) FROM pages WHERE id = ?1", rusqlite::params![page_id], |row| row.get(0))
            .unwrap();
        assert_eq!(page_count, 1, "Page should still exist after folder deletion");

        let folder: Option<String> = db.conn
            .query_row("SELECT folder_id FROM pages WHERE id = ?1", rusqlite::params![page_id], |row| row.get(0))
            .unwrap();
        assert!(folder.is_none(), "Page folder_id should be NULL after folder deletion");
    }

    #[test]
    fn test_page_without_folder() {
        let db = setup();
        let now = chrono::Utc::now().to_rfc3339();
        let page_id = uuid::Uuid::new_v4().to_string();

        // Create page without folder_id (root page)
        db.conn
            .execute(
                "INSERT INTO pages (id, title, slug, content, folder_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![page_id, "Root Page", "root-page", "{}", None::<String>, now, now],
            )
            .unwrap();

        // list_pages command finds pages where folder_id IS NULL
        let count: i64 = db.conn
            .query_row("SELECT COUNT(*) FROM pages WHERE folder_id IS NULL", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }
}
