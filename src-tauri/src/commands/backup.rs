use crate::AppState;
use std::fs;
use tauri::State;

#[tauri::command]
pub fn backup_database(state: State<AppState>, destination: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let source = &db.path;

    // Force WAL checkpoint so all data is in the main file before copying
    db.conn
        .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
        .map_err(|e| format!("Failed to checkpoint WAL: {}", e))?;

    fs::copy(source, &destination)
        .map_err(|e| format!("Failed to backup database: {}", e))?;

    Ok(format!("Database backed up to {}", destination))
}

#[tauri::command]
pub fn restore_database(state: State<AppState>, backup_path: String) -> Result<String, String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    let db_path = db.path.clone();

    // Copy the backup file over the current database file
    fs::copy(&backup_path, &db_path)
        .map_err(|e| format!("Failed to restore database: {}", e))?;

    // Remove stale WAL/SHM files that would interfere with the restored DB
    let wal_path = db_path.with_extension("db-wal");
    let shm_path = db_path.with_extension("db-shm");
    let _ = fs::remove_file(&wal_path);
    let _ = fs::remove_file(&shm_path);

    // Reinitialize the database connection with migrations
    let app_dir = db_path.parent().ok_or("Invalid database path")?;
    let new_db = crate::db::Database::new(app_dir)
        .map_err(|e| format!("Failed to initialize restored database: {}", e))?;

    *db = new_db;

    Ok("Database restored successfully".to_string())
}
