use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

// ── Chat Sessions ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub id: String,
    pub title: Option<String>,
    pub model_id: Option<String>,
    pub prompt_template_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn list_chat_sessions(state: State<AppState>) -> Result<Vec<ChatSession>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare("SELECT id, title, model_id, prompt_template_id, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let sessions = stmt
        .query_map([], |row| {
            Ok(ChatSession {
                id: row.get(0)?,
                title: row.get(1)?,
                model_id: row.get(2)?,
                prompt_template_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(sessions)
}

#[tauri::command]
pub fn create_chat_session(
    state: State<AppState>,
    title: Option<String>,
    model_id: Option<String>,
    prompt_template_id: Option<String>,
) -> Result<ChatSession, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    db.conn
        .execute(
            "INSERT INTO chat_sessions (id, title, model_id, prompt_template_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, title, model_id, prompt_template_id, now, now],
        )
        .map_err(|e| e.to_string())?;
    Ok(ChatSession { id, title, model_id, prompt_template_id, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
pub fn update_chat_session(
    state: State<AppState>,
    id: String,
    title: Option<String>,
    model_id: Option<String>,
    prompt_template_id: Option<String>,
) -> Result<ChatSession, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(ref t) = title {
        db.conn.execute("UPDATE chat_sessions SET title = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![t, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(ref m) = model_id {
        db.conn.execute("UPDATE chat_sessions SET model_id = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![m, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(ref p) = prompt_template_id {
        db.conn.execute("UPDATE chat_sessions SET prompt_template_id = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![p, now, id]).map_err(|e| e.to_string())?;
    }
    let session = db.conn.query_row(
        "SELECT id, title, model_id, prompt_template_id, created_at, updated_at FROM chat_sessions WHERE id = ?1",
        rusqlite::params![id],
        |row| Ok(ChatSession { id: row.get(0)?, title: row.get(1)?, model_id: row.get(2)?, prompt_template_id: row.get(3)?, created_at: row.get(4)?, updated_at: row.get(5)? }),
    ).map_err(|e| e.to_string())?;
    Ok(session)
}

#[tauri::command]
pub fn delete_chat_session(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn.execute("DELETE FROM chat_sessions WHERE id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Chat Messages ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub id: String,
    pub chat_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[tauri::command]
pub fn get_chat_messages(state: State<AppState>, chat_id: String, before: Option<String>, limit: Option<i32>) -> Result<Vec<ChatMessage>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(50);
    let query = if before.is_some() {
        "SELECT id, chat_id, role, content, created_at FROM chat_messages WHERE chat_id = ?1 AND created_at < ?2 ORDER BY created_at DESC LIMIT ?3"
    } else {
        "SELECT id, chat_id, role, content, created_at FROM chat_messages WHERE chat_id = ?1 ORDER BY created_at DESC LIMIT ?2"
    };
    let mut stmt = db.conn.prepare(query).map_err(|e| e.to_string())?;
    let messages = if let Some(ref b) = before {
        stmt.query_map(rusqlite::params![chat_id, b, limit], |row| {
            Ok(ChatMessage { id: row.get(0)?, chat_id: row.get(1)?, role: row.get(2)?, content: row.get(3)?, created_at: row.get(4)? })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    } else {
        stmt.query_map(rusqlite::params![chat_id, limit], |row| {
            Ok(ChatMessage { id: row.get(0)?, chat_id: row.get(1)?, role: row.get(2)?, content: row.get(3)?, created_at: row.get(4)? })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };
    Ok(messages.into_iter().rev().collect())
}

#[tauri::command]
pub fn create_chat_message(state: State<AppState>, chat_id: String, role: String, content: String) -> Result<ChatMessage, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    db.conn.execute(
        "INSERT INTO chat_messages (id, chat_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, chat_id, role, content, now],
    ).map_err(|e| e.to_string())?;

    // Auto-generate title from first user message
    if role == "user" {
        let count: i64 = db.conn.query_row("SELECT COUNT(*) FROM chat_messages WHERE chat_id = ?1 AND role = 'user'", rusqlite::params![chat_id], |row| row.get(0)).unwrap_or(0);
        if count <= 1 {
            let truncated = content.chars().take(60).collect::<String>();
            let title = if content.len() > 60 { format!("{}...", truncated) } else { truncated };
            db.conn.execute("UPDATE chat_sessions SET title = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![title, now, chat_id]).map_err(|e| e.to_string())?;
        }
    }

    Ok(ChatMessage { id, chat_id, role, content, created_at: now })
}

// ── Prompt Templates ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub content: String,
    pub description: Option<String>,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn list_prompt_templates(state: State<AppState>) -> Result<Vec<PromptTemplate>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.conn.prepare("SELECT id, name, content, description, is_default, created_at, updated_at FROM prompt_templates ORDER BY created_at DESC").map_err(|e| e.to_string())?;
    let templates = stmt.query_map([], |row| {
        Ok(PromptTemplate { id: row.get(0)?, name: row.get(1)?, content: row.get(2)?, description: row.get(3)?, is_default: row.get::<_, i32>(4)? != 0, created_at: row.get(5)?, updated_at: row.get(6)? })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(templates)
}

#[tauri::command]
pub fn create_prompt_template(state: State<AppState>, name: String, content: String, description: Option<String>, is_default: Option<bool>) -> Result<PromptTemplate, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let default = is_default.unwrap_or(false);
    db.conn.execute(
        "INSERT INTO prompt_templates (id, name, content, description, is_default, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, name, content, description, default, now, now],
    ).map_err(|e| e.to_string())?;
    Ok(PromptTemplate { id, name, content, description, is_default: default, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
pub fn update_prompt_template(state: State<AppState>, id: String, name: Option<String>, content: Option<String>, description: Option<String>, is_default: Option<bool>) -> Result<PromptTemplate, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(ref n) = name { db.conn.execute("UPDATE prompt_templates SET name = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![n, now, id]).map_err(|e| e.to_string())?; }
    if let Some(ref c) = content { db.conn.execute("UPDATE prompt_templates SET content = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![c, now, id]).map_err(|e| e.to_string())?; }
    if let Some(ref d) = description { db.conn.execute("UPDATE prompt_templates SET description = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![d, now, id]).map_err(|e| e.to_string())?; }
    if let Some(d) = is_default { db.conn.execute("UPDATE prompt_templates SET is_default = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![d as i32, now, id]).map_err(|e| e.to_string())?; }
    let template = db.conn.query_row(
        "SELECT id, name, content, description, is_default, created_at, updated_at FROM prompt_templates WHERE id = ?1",
        rusqlite::params![id],
        |row| Ok(PromptTemplate { id: row.get(0)?, name: row.get(1)?, content: row.get(2)?, description: row.get(3)?, is_default: row.get::<_, i32>(4)? != 0, created_at: row.get(5)?, updated_at: row.get(6)? }),
    ).map_err(|e| e.to_string())?;
    Ok(template)
}

#[tauri::command]
pub fn delete_prompt_template(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn.execute("DELETE FROM prompt_templates WHERE id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
