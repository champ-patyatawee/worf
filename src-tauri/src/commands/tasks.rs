use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub status: String,
    pub position: i32,
    pub board_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn create_task(
    state: State<AppState>,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    status: Option<String>,
    board_id: String,
) -> Result<Task, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let task_priority = priority.unwrap_or_else(|| "medium".to_string());
    let task_status = status.unwrap_or_else(|| "todo".to_string());

    // Get max position for this board
    let max_pos: i32 = db
        .conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM tasks WHERE board_id = ?1",
            rusqlite::params![board_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let position = max_pos + 1;

    db.conn
        .execute(
            "INSERT INTO tasks (id, title, description, priority, status, position, board_id, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![id, title, description, task_priority, task_status, position, board_id, now, now],
        )
        .map_err(|e| e.to_string())?;

    Ok(Task {
        id,
        title,
        description,
        priority: task_priority,
        status: task_status,
        position,
        board_id,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_task(
    state: State<AppState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
    priority: Option<String>,
    status: Option<String>,
) -> Result<Task, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(ref t) = title {
        db.conn
            .execute(
                "UPDATE tasks SET title = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![t, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref d) = description {
        db.conn
            .execute(
                "UPDATE tasks SET description = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![d, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref p) = priority {
        db.conn
            .execute(
                "UPDATE tasks SET priority = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![p, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref s) = status {
        db.conn
            .execute(
                "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![s, now, id],
            )
            .map_err(|e| e.to_string())?;
    }

    let task = db
        .conn
        .query_row(
            "SELECT id, title, description, priority, status, position, board_id, created_at, updated_at 
             FROM tasks WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    priority: row.get(3)?,
                    status: row.get(4)?,
                    position: row.get(5)?,
                    board_id: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn move_task(
    state: State<AppState>,
    id: String,
    status: String,
    position: Option<i32>,
) -> Result<Task, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    db.conn
        .execute(
            "UPDATE tasks SET status = ?1, position = COALESCE(?2, position), updated_at = ?3 WHERE id = ?4",
            rusqlite::params![status, position, now, id],
        )
        .map_err(|e| e.to_string())?;

    // Re-order tasks in the target column
    let mut stmt = db
        .conn
        .prepare(
            "SELECT id FROM tasks WHERE status = ?1 ORDER BY position ASC",
        )
        .map_err(|e| e.to_string())?;

    let task_ids: Vec<String> = stmt
        .query_map(rusqlite::params![status], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (i, tid) in task_ids.iter().enumerate() {
        db.conn
            .execute(
                "UPDATE tasks SET position = ?1 WHERE id = ?2",
                rusqlite::params![i as i32, tid],
            )
            .map_err(|e| e.to_string())?;
    }

    let task = db
        .conn
        .query_row(
            "SELECT id, title, description, priority, status, position, board_id, created_at, updated_at 
             FROM tasks WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    priority: row.get(3)?,
                    status: row.get(4)?,
                    position: row.get(5)?,
                    board_id: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn delete_task(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM tasks WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
