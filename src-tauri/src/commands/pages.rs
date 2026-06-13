use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Page {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

fn generate_slug(title: &str) -> String {
    let slug: String = title
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '-')
        .collect::<String>()
        .trim()
        .replace(' ', "-")
        .replace("--", "-");
    if slug.is_empty() {
        "untitled".to_string()
    } else {
        slug
    }
}

fn unique_slug(conn: &rusqlite::Connection, title: &str) -> Result<String, String> {
    let base = generate_slug(title);
    let mut slug = base.clone();
    let mut counter = 1;
    while {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM pages WHERE slug = ?1",
                rusqlite::params![slug],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| e.to_string())?
            > 0
            || slug.is_empty();
        exists
    } {
        slug = format!("{}-{}", base, counter);
        counter += 1;
    }
    Ok(slug)
}

#[tauri::command]
pub fn list_pages(state: State<AppState>) -> Result<Vec<Page>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(
            "SELECT id, title, slug, content, folder_id, created_at, updated_at 
             FROM pages WHERE folder_id IS NULL 
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let pages = stmt
        .query_map([], |row| {
            Ok(Page {
                id: row.get(0)?,
                title: row.get(1)?,
                slug: row.get(2)?,
                content: row.get(3)?,
                folder_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(pages)
}

#[tauri::command]
pub fn list_pages_in_folder(state: State<AppState>, folder_id: String) -> Result<Vec<Page>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(
            "SELECT id, title, slug, content, folder_id, created_at, updated_at 
             FROM pages WHERE folder_id = ?1 
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let pages = stmt
        .query_map(rusqlite::params![folder_id], |row| {
            Ok(Page {
                id: row.get(0)?,
                title: row.get(1)?,
                slug: row.get(2)?,
                content: row.get(3)?,
                folder_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(pages)
}

#[tauri::command]
pub fn get_page(state: State<AppState>, id: String) -> Result<Page, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let page = db
        .conn
        .query_row(
            "SELECT id, title, slug, content, folder_id, created_at, updated_at FROM pages WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Page {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    slug: row.get(2)?,
                    content: row.get(3)?,
                    folder_id: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(page)
}

#[tauri::command]
pub fn create_page(
    state: State<AppState>,
    title: Option<String>,
    folder_id: Option<String>,
) -> Result<Page, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let page_title = title.clone().unwrap_or_else(|| "Untitled".to_string());
    let slug = unique_slug(&db.conn, &page_title)?;
    let content = r#"{"type":"doc","content":[{"type":"paragraph","content":[]}]}"#.to_string();

    db.conn
        .execute(
            "INSERT INTO pages (id, title, slug, content, folder_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, page_title, slug, content, folder_id, now, now],
        )
        .map_err(|e| e.to_string())?;

    Ok(Page {
        id,
        title: page_title,
        slug,
        content,
        folder_id,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_page(
    state: State<AppState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
) -> Result<Page, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(ref new_title) = title {
        let slug = unique_slug(&db.conn, new_title)?;
        db.conn
            .execute(
                "UPDATE pages SET title = ?1, slug = ?2, updated_at = ?3 WHERE id = ?4",
                rusqlite::params![new_title, slug, now, id],
            )
            .map_err(|e| e.to_string())?;
    }

    if let Some(ref new_content) = content {
        db.conn
            .execute(
                "UPDATE pages SET content = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![new_content, now, id],
            )
            .map_err(|e| e.to_string())?;
    }

    let page = db
        .conn
        .query_row(
            "SELECT id, title, slug, content, folder_id, created_at, updated_at FROM pages WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Page {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    slug: row.get(2)?,
                    content: row.get(3)?,
                    folder_id: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(page)
}

#[tauri::command]
pub fn delete_page(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM pages WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
