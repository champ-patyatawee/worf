use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Sprint {
    pub id: String,
    pub board_id: String,
    pub name: String,
    pub goal: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub status: String, // "planning" | "active" | "complete"
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SprintCompleteSummary {
    pub sprint: Sprint,
    pub total_tasks: i32,
    pub completed_tasks: i32,
    pub moved_to_backlog: i32,
}

fn row_to_sprint(row: &rusqlite::Row) -> rusqlite::Result<Sprint> {
    Ok(Sprint {
        id: row.get(0)?,
        board_id: row.get(1)?,
        name: row.get(2)?,
        goal: row.get(3)?,
        start_date: row.get(4)?,
        end_date: row.get(5)?,
        status: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

const SPRINT_SELECT: &str = "SELECT id, board_id, name, goal, start_date, end_date, status, created_at, updated_at FROM sprints";

#[tauri::command]
pub fn create_sprint(
    state: State<AppState>,
    board_id: String,
    name: String,
    goal: Option<String>,
    start_date: String,
    end_date: String,
) -> Result<Sprint, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.conn
        .execute(
            "INSERT INTO sprints (id, board_id, name, goal, start_date, end_date, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![id, board_id, name, goal, start_date, end_date, "planning", now, now],
        )
        .map_err(|e| e.to_string())?;

    Ok(Sprint {
        id,
        board_id,
        name,
        goal,
        start_date,
        end_date,
        status: "planning".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_sprints(state: State<AppState>, board_id: String) -> Result<Vec<Sprint>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(&format!(
            "{} WHERE board_id = ?1 ORDER BY start_date DESC",
            SPRINT_SELECT
        ))
        .map_err(|e| e.to_string())?;

    let sprints = stmt
        .query_map(rusqlite::params![board_id], row_to_sprint)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sprints)
}

#[tauri::command]
pub fn get_active_sprint(state: State<AppState>, board_id: String) -> Result<Option<Sprint>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let result = db.conn.query_row(
        &format!(
            "{} WHERE board_id = ?1 AND status = 'active'",
            SPRINT_SELECT
        ),
        rusqlite::params![board_id],
        row_to_sprint,
    );

    match result {
        Ok(sprint) => Ok(Some(sprint)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn start_sprint(state: State<AppState>, id: String) -> Result<Sprint, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Get the sprint's board_id first
    let board_id: String = db
        .conn
        .query_row(
            "SELECT board_id FROM sprints WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Set all other sprints in same board to "planning"
    db.conn
        .execute(
            "UPDATE sprints SET status = 'planning', updated_at = ?1 WHERE board_id = ?2 AND id != ?3 AND status = 'active'",
            rusqlite::params![now, board_id, id],
        )
        .map_err(|e| e.to_string())?;

    // Set this sprint to "active"
    db.conn
        .execute(
            "UPDATE sprints SET status = 'active', updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        )
        .map_err(|e| e.to_string())?;

    db.conn
        .query_row(
            &format!("{} WHERE id = ?1", SPRINT_SELECT),
            rusqlite::params![id],
            row_to_sprint,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn complete_sprint(state: State<AppState>, id: String) -> Result<SprintCompleteSummary, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // STEP 1: Count BEFORE moving (tasks still have sprint_id)
    let total: i32 = db
        .conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE sprint_id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let completed: i32 = db
        .conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE sprint_id = ?1 AND status = 'done'",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let moved = total - completed;

    // STEP 2: Move uncompleted tasks back to backlog (sprint_id = null)
    db.conn
        .execute(
            "UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?1 AND status != 'done'",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;

    // STEP 3: Set sprint status to "complete"
    db.conn
        .execute(
            "UPDATE sprints SET status = 'complete', updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        )
        .map_err(|e| e.to_string())?;

    let sprint = db
        .conn
        .query_row(
            &format!("{} WHERE id = ?1", SPRINT_SELECT),
            rusqlite::params![id],
            row_to_sprint,
        )
        .map_err(|e| e.to_string())?;

    Ok(SprintCompleteSummary {
        sprint,
        total_tasks: total,
        completed_tasks: completed,
        moved_to_backlog: moved,
    })
}

#[tauri::command]
pub fn update_sprint(
    state: State<AppState>,
    id: String,
    name: Option<String>,
    goal: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Sprint, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(ref v) = name {
        db.conn
            .execute(
                "UPDATE sprints SET name = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![v, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if goal.is_some() {
        db.conn
            .execute(
                "UPDATE sprints SET goal = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![goal, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref v) = start_date {
        db.conn
            .execute(
                "UPDATE sprints SET start_date = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![v, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref v) = end_date {
        db.conn
            .execute(
                "UPDATE sprints SET end_date = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![v, now, id],
            )
            .map_err(|e| e.to_string())?;
    }

    db.conn
        .query_row(
            &format!("{} WHERE id = ?1", SPRINT_SELECT),
            rusqlite::params![id],
            row_to_sprint,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_sprint(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Set tasks' sprint_id to null first (ON DELETE SET NULL may not fire for manual delete)
    db.conn
        .execute(
            "UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;

    db.conn
        .execute("DELETE FROM sprints WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}