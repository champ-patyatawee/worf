use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderFolderItem {
    pub id: String,
    pub position: i32,
}

#[tauri::command]
pub fn list_folders(state: State<AppState>) -> Result<Vec<Folder>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare("SELECT id, name, COALESCE(position, 0), created_at, updated_at FROM folders ORDER BY position ASC, name ASC")
        .map_err(|e| e.to_string())?;
    let folders = stmt
        .query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                position: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(folders)
}

#[tauri::command]
pub fn create_folder(state: State<AppState>, name: String) -> Result<Folder, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let position: i32 = db
        .conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM folders",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let position = position + 1;
    db.conn
        .execute(
            "INSERT INTO folders (id, name, position, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![id, name, position, now, now],
        )
        .map_err(|e| e.to_string())?;
    Ok(Folder {
        id,
        name,
        position,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn rename_folder(state: State<AppState>, id: String, name: String) -> Result<Folder, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.conn
        .execute(
            "UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![name, now, id],
        )
        .map_err(|e| e.to_string())?;
    let folder = db
        .conn
        .query_row(
            "SELECT id, name, COALESCE(position, 0), created_at, updated_at FROM folders WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Folder {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    position: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;
    Ok(folder)
}

#[tauri::command]
pub fn delete_folder(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Trash all notes in this folder before deleting it
    db.conn
        .execute(
            "UPDATE notes SET deleted_at = ?1, updated_at = ?1 WHERE folder_id = ?2 AND deleted_at IS NULL",
            rusqlite::params![now, id],
        )
        .map_err(|e| e.to_string())?;

    db.conn
        .execute("DELETE FROM folders WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_folders(state: State<AppState>, items: Vec<ReorderFolderItem>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    for item in &items {
        db.conn
            .execute(
                "UPDATE folders SET position = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![item.position, now, item.id],
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}