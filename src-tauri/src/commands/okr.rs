use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Objective {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub quarter: String,
    pub year: i32,
    pub progress: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyResult {
    pub id: String,
    pub objective_id: String,
    pub title: String,
    pub initial_value: f64,
    pub target_value: f64,
    pub current_value: f64,
    pub unit: Option<String>,
    pub confidence: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ObjectiveWithKRs {
    pub objective: Objective,
    pub key_results: Vec<KeyResult>,
    pub board_ids: Vec<String>,
}

fn row_to_objective(row: &rusqlite::Row) -> rusqlite::Result<Objective> {
    Ok(Objective {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        quarter: row.get(3)?,
        year: row.get(4)?,
        progress: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn row_to_key_result(row: &rusqlite::Row) -> rusqlite::Result<KeyResult> {
    Ok(KeyResult {
        id: row.get(0)?,
        objective_id: row.get(1)?,
        title: row.get(2)?,
        initial_value: row.get(3)?,
        target_value: row.get(4)?,
        current_value: row.get(5)?,
        unit: row.get(6)?,
        confidence: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

const OBJECTIVE_SELECT: &str =
    "SELECT id, title, description, quarter, year, progress, created_at, updated_at FROM okr_objectives";

const KEY_RESULT_SELECT: &str =
    "SELECT id, objective_id, title, initial_value, target_value, current_value, unit, confidence, created_at, updated_at FROM okr_key_results";

/// Recompute objective progress as the average of all KR progress values.
/// Each KR's individual progress = (current_value - initial_value) / (target_value - initial_value), clamped 0..1.
fn recompute_objective_progress(conn: &rusqlite::Connection, objective_id: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare(&format!(
            "{} WHERE objective_id = ?1",
            KEY_RESULT_SELECT
        ))
        .map_err(|e| e.to_string())?;

    let krs: Vec<KeyResult> = stmt
        .query_map(rusqlite::params![objective_id], row_to_key_result)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let progress = if krs.is_empty() {
        0.0
    } else {
        let sum: f64 = krs
            .iter()
            .map(|kr| {
                let range = kr.target_value - kr.initial_value;
                if range == 0.0 {
                    1.0
                } else {
                    let p = (kr.current_value - kr.initial_value) / range;
                    p.clamp(0.0, 1.0)
                }
            })
            .sum();
        sum / krs.len() as f64
    };

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE okr_objectives SET progress = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![progress, now, objective_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ── Objectives ──

#[tauri::command]
pub fn create_objective(
    state: State<AppState>,
    title: String,
    description: Option<String>,
    quarter: String,
    year: i32,
) -> Result<Objective, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.conn
        .execute(
            "INSERT INTO okr_objectives (id, title, description, quarter, year, progress, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, title, description, quarter, year, 0.0, now, now],
        )
        .map_err(|e| e.to_string())?;

    Ok(Objective {
        id,
        title,
        description,
        quarter,
        year,
        progress: 0.0,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_objectives(
    state: State<AppState>,
    quarter: String,
    year: i32,
) -> Result<Vec<Objective>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(&format!(
            "{} WHERE quarter = ?1 AND year = ?2 ORDER BY progress DESC",
            OBJECTIVE_SELECT
        ))
        .map_err(|e| e.to_string())?;

    let objectives = stmt
        .query_map(rusqlite::params![quarter, year], row_to_objective)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(objectives)
}

#[tauri::command]
pub fn get_objective(state: State<AppState>, id: String) -> Result<ObjectiveWithKRs, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let objective = db
        .conn
        .query_row(
            &format!("{} WHERE id = ?1", OBJECTIVE_SELECT),
            rusqlite::params![id],
            row_to_objective,
        )
        .map_err(|e| e.to_string())?;

    let mut kr_stmt = db
        .conn
        .prepare(&format!(
            "{} WHERE objective_id = ?1 ORDER BY created_at ASC",
            KEY_RESULT_SELECT
        ))
        .map_err(|e| e.to_string())?;

    let key_results = kr_stmt
        .query_map(rusqlite::params![id], row_to_key_result)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut board_stmt = db
        .conn
        .prepare("SELECT board_id FROM board_objectives WHERE objective_id = ?1")
        .map_err(|e| e.to_string())?;

    let board_ids = board_stmt
        .query_map(rusqlite::params![id], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(ObjectiveWithKRs {
        objective,
        key_results,
        board_ids,
    })
}

#[tauri::command]
pub fn update_objective(
    state: State<AppState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
) -> Result<Objective, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(ref v) = title {
        db.conn
            .execute(
                "UPDATE okr_objectives SET title = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![v, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if description.is_some() {
        db.conn
            .execute(
                "UPDATE okr_objectives SET description = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![description, now, id],
            )
            .map_err(|e| e.to_string())?;
    }

    db.conn
        .query_row(
            &format!("{} WHERE id = ?1", OBJECTIVE_SELECT),
            rusqlite::params![id],
            row_to_objective,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_objective(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Delete board links first
    db.conn
        .execute(
            "DELETE FROM board_objectives WHERE objective_id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;

    // Delete key results
    db.conn
        .execute(
            "DELETE FROM okr_key_results WHERE objective_id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;

    // Delete the objective
    db.conn
        .execute(
            "DELETE FROM okr_objectives WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ── Key Results ──

#[tauri::command]
pub fn create_key_result(
    state: State<AppState>,
    objective_id: String,
    title: String,
    target_value: f64,
    unit: Option<String>,
    confidence: Option<i32>,
) -> Result<KeyResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.conn
        .execute(
            "INSERT INTO okr_key_results (id, objective_id, title, initial_value, target_value, current_value, unit, confidence, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![id, objective_id, title, 0.0, target_value, 0.0, unit, confidence, now, now],
        )
        .map_err(|e| e.to_string())?;

    recompute_objective_progress(&db.conn, &objective_id)?;

    Ok(KeyResult {
        id,
        objective_id,
        title,
        initial_value: 0.0,
        target_value,
        current_value: 0.0,
        unit,
        confidence,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_key_result(
    state: State<AppState>,
    id: String,
    current_value: Option<f64>,
    confidence: Option<i32>,
) -> Result<KeyResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(v) = current_value {
        db.conn
            .execute(
                "UPDATE okr_key_results SET current_value = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![v, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = confidence {
        db.conn
            .execute(
                "UPDATE okr_key_results SET confidence = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![v, now, id],
            )
            .map_err(|e| e.to_string())?;
    }

    let kr = db
        .conn
        .query_row(
            &format!("{} WHERE id = ?1", KEY_RESULT_SELECT),
            rusqlite::params![id],
            row_to_key_result,
        )
        .map_err(|e| e.to_string())?;

    recompute_objective_progress(&db.conn, &kr.objective_id)?;

    Ok(kr)
}

#[tauri::command]
pub fn delete_key_result(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Get objective_id before deleting
    let objective_id: String = db
        .conn
        .query_row(
            "SELECT objective_id FROM okr_key_results WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    db.conn
        .execute(
            "DELETE FROM okr_key_results WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;

    recompute_objective_progress(&db.conn, &objective_id)?;

    Ok(())
}

// ── Board links ──

#[tauri::command]
pub fn link_board_to_objective(
    state: State<AppState>,
    board_id: String,
    objective_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute(
            "INSERT OR IGNORE INTO board_objectives (board_id, objective_id) VALUES (?1, ?2)",
            rusqlite::params![board_id, objective_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn unlink_board_from_objective(
    state: State<AppState>,
    board_id: String,
    objective_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute(
            "DELETE FROM board_objectives WHERE board_id = ?1 AND objective_id = ?2",
            rusqlite::params![board_id, objective_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}