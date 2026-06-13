use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIProvider {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub is_active: bool,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProviderInput {
    pub name: String,
    pub provider: String,
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProviderInput {
    pub name: Option<String>,
    pub provider: Option<String>,
    pub api_url: Option<String>,
    pub api_key: Option<String>,
    pub model: Option<String>,
    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
}

#[tauri::command]
pub fn list_providers(state: State<AppState>) -> Result<Vec<AIProvider>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(
            "SELECT id, name, provider, api_url, api_key, model, is_active, is_default, created_at, updated_at 
             FROM ai_providers ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let providers = stmt
        .query_map([], |row| {
            Ok(AIProvider {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: row.get(2)?,
                api_url: row.get(3)?,
                api_key: row.get(4)?,
                model: row.get(5)?,
                is_active: row.get::<_, i32>(6)? != 0,
                is_default: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(providers)
}

#[tauri::command]
pub fn create_provider(state: State<AppState>, input: CreateProviderInput) -> Result<AIProvider, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let is_default = input.is_default.unwrap_or(false);

    db.conn
        .execute(
            "INSERT INTO ai_providers (id, name, provider, api_url, api_key, model, is_active, is_default, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9)",
            rusqlite::params![id, input.name, input.provider, input.api_url, input.api_key, input.model, is_default, now, now],
        )
        .map_err(|e| e.to_string())?;

    Ok(AIProvider {
        id,
        name: input.name,
        provider: input.provider,
        api_url: input.api_url,
        api_key: input.api_key,
        model: input.model,
        is_active: true,
        is_default,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_provider(state: State<AppState>, id: String, input: UpdateProviderInput) -> Result<AIProvider, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(ref name) = input.name {
        db.conn
            .execute("UPDATE ai_providers SET name = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![name, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref provider) = input.provider {
        db.conn
            .execute("UPDATE ai_providers SET provider = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![provider, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref api_url) = input.api_url {
        db.conn
            .execute("UPDATE ai_providers SET api_url = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![api_url, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref api_key) = input.api_key {
        db.conn
            .execute("UPDATE ai_providers SET api_key = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![api_key, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref model) = input.model {
        db.conn
            .execute("UPDATE ai_providers SET model = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![model, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(is_active) = input.is_active {
        db.conn
            .execute("UPDATE ai_providers SET is_active = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![is_active as i32, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(is_default) = input.is_default {
        db.conn
            .execute("UPDATE ai_providers SET is_default = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![is_default as i32, now, id])
            .map_err(|e| e.to_string())?;
    }

    let provider = db
        .conn
        .query_row(
            "SELECT id, name, provider, api_url, api_key, model, is_active, is_default, created_at, updated_at FROM ai_providers WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(AIProvider {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    provider: row.get(2)?,
                    api_url: row.get(3)?,
                    api_key: row.get(4)?,
                    model: row.get(5)?,
                    is_active: row.get::<_, i32>(6)? != 0,
                    is_default: row.get::<_, i32>(7)? != 0,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(provider)
}

#[tauri::command]
pub fn delete_provider(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM ai_providers WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// Settings helpers

#[tauri::command]
pub fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let result = db.conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_setting(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();

    db.conn.execute(
        "INSERT INTO settings (id, key, value, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(key) DO UPDATE SET value = ?3, updated_at = ?5",
        rusqlite::params![id, key, value, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
