use crate::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct Board {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct BoardWithTasks {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tasks: Vec<super::tasks::Task>,
}

fn generate_slug(name: &str) -> String {
    name.to_lowercase()
        .trim()
        .replace(|c: char| !c.is_alphanumeric() && c != ' ', "-")
        .replace(" -", "-")
        .replace("- ", "-")
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn unique_board_slug(conn: &rusqlite::Connection, name: &str) -> Result<String, String> {
    let base = generate_slug(name);
    if base.is_empty() {
        return Ok("untitled".to_string());
    }
    let mut slug = base.clone();
    let mut counter = 1;
    while {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM boards WHERE slug = ?1",
                rusqlite::params![slug],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| e.to_string())?
            > 0;
        exists
    } {
        slug = format!("{}-{}", base, counter);
        counter += 1;
    }
    Ok(slug)
}

#[tauri::command]
pub fn list_boards(state: State<AppState>) -> Result<Vec<Board>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare("SELECT id, name, slug, description, created_at, updated_at FROM boards ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let boards = stmt
        .query_map([], |row| {
            Ok(Board {
                id: row.get(0)?,
                name: row.get(1)?,
                slug: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(boards)
}

#[tauri::command]
pub fn get_board(state: State<AppState>, id_or_slug: String) -> Result<BoardWithTasks, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let board = db.conn.query_row(
        "SELECT id, name, slug, description, created_at, updated_at FROM boards WHERE id = ?1",
        rusqlite::params![id_or_slug],
        |row| {
            Ok(Board {
                id: row.get(0)?, name: row.get(1)?, slug: row.get(2)?,
                description: row.get(3)?, created_at: row.get(4)?, updated_at: row.get(5)?,
            })
        },
    ).or_else(|_| {
        db.conn.query_row(
            "SELECT id, name, slug, description, created_at, updated_at FROM boards WHERE slug = ?1",
            rusqlite::params![id_or_slug],
            |row| {
                Ok(Board {
                    id: row.get(0)?, name: row.get(1)?, slug: row.get(2)?,
                    description: row.get(3)?, created_at: row.get(4)?, updated_at: row.get(5)?,
                })
            },
        )
    }).map_err(|e| e.to_string())?;

    let mut stmt = db.conn.prepare(
        "SELECT id, title, description, priority, status, position, board_id, created_at, updated_at 
         FROM tasks WHERE board_id = ?1 ORDER BY position ASC",
    ).map_err(|e| e.to_string())?;

    let tasks = stmt.query_map(rusqlite::params![board.id], |row| {
        Ok(super::tasks::Task {
            id: row.get(0)?, title: row.get(1)?, description: row.get(2)?,
            priority: row.get(3)?, status: row.get(4)?, position: row.get(5)?,
            board_id: row.get(6)?, created_at: row.get(7)?, updated_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(BoardWithTasks {
        id: board.id, name: board.name, slug: board.slug,
        description: board.description, created_at: board.created_at,
        updated_at: board.updated_at, tasks,
    })
}

#[tauri::command]
pub fn create_board(state: State<AppState>, name: String, description: Option<String>) -> Result<Board, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let slug = unique_board_slug(&db.conn, &name)?;

    db.conn
        .execute(
            "INSERT INTO boards (id, name, slug, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, name, slug, description, now, now],
        )
        .map_err(|e| e.to_string())?;

    Ok(Board {
        id,
        name,
        slug,
        description,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_board(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM boards WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
