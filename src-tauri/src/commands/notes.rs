use crate::commands::folders::Folder;
use crate::AppState;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::State;

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub tags: String,
    pub frontmatter: String,
    pub pinned: i32,
    pub position: i32,
    pub word_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderItem {
    pub id: String,
    pub position: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NoteWithRelations {
    pub note: Note,
    pub backlinks: Vec<LinkInfo>,
    pub outbound_links: Vec<LinkInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LinkInfo {
    pub note_id: String,
    pub note_title: String,
    pub note_slug: String,
    pub link_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub snippet: String,
    pub tags: String,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
                "SELECT COUNT(*) FROM notes WHERE slug = ?1",
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

fn count_words(content: &str) -> i32 {
    content.split_whitespace().count() as i32
}

/// Parse [[wikilinks]] from markdown content.
/// Returns list of (target_title, display_text) tuples.
fn parse_wikilinks(content: &str) -> Vec<(String, String)> {
    static RE: OnceLock<Regex> = OnceLock::new();
    let re = RE.get_or_init(|| Regex::new(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap());
    re.captures_iter(content)
        .map(|cap| {
            let target = cap[1].trim().to_string();
            let display = cap
                .get(2)
                .map(|m| m.as_str().trim().to_string())
                .unwrap_or_else(|| target.clone());
            (target, display)
        })
        .collect()
}

/// Resolve a wikilink target (title or slug) to a note ID.
fn resolve_link_target(conn: &rusqlite::Connection, title: &str) -> Option<String> {
    conn.query_row(
        "SELECT id FROM notes WHERE title = ?1 OR slug = ?1 LIMIT 1",
        rusqlite::params![title],
        |row| row.get(0),
    )
    .ok()
}

/// Rebuild the note_links table entries for a given note.
fn update_note_links(conn: &rusqlite::Connection, note_id: &str, content: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM note_links WHERE source_id = ?1",
        rusqlite::params![note_id],
    )
    .map_err(|e| e.to_string())?;

    let links = parse_wikilinks(content);
    for (target_title, link_text) in links {
        if let Some(target_id) = resolve_link_target(conn, &target_title) {
            if target_id != note_id {
                let id = uuid::Uuid::new_v4().to_string();
                let now = chrono::Utc::now().to_rfc3339();
                conn.execute(
                    "INSERT INTO note_links (id, source_id, target_id, link_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                    rusqlite::params![id, note_id, target_id, link_text, now],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        slug: row.get(2)?,
        content: row.get(3)?,
        folder_id: row.get(4)?,
        tags: row.get(5)?,
        frontmatter: row.get(6)?,
        pinned: row.get(7)?,
        position: row.get(8)?,
        word_count: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

fn note_from_query(conn: &rusqlite::Connection, sql: &str, params: &[&dyn rusqlite::types::ToSql]) -> Result<Note, String> {
    conn.query_row(sql, params, row_to_note)
        .map_err(|e| e.to_string())
}

fn fetch_backlinks(conn: &rusqlite::Connection, note_id: &str) -> Result<Vec<LinkInfo>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT n.id, n.title, n.slug, nl.link_text
             FROM note_links nl
             JOIN notes n ON n.id = nl.source_id
             WHERE nl.target_id = ?1
             ORDER BY n.title",
        )
        .map_err(|e| e.to_string())?;
    let links = stmt
        .query_map(rusqlite::params![note_id], |row| {
            Ok(LinkInfo {
                note_id: row.get(0)?,
                note_title: row.get(1)?,
                note_slug: row.get(2)?,
                link_text: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(links)
}

fn fetch_outbound_links(conn: &rusqlite::Connection, note_id: &str) -> Result<Vec<LinkInfo>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT n.id, n.title, n.slug, nl.link_text
             FROM note_links nl
             JOIN notes n ON n.id = nl.target_id
             WHERE nl.source_id = ?1
             ORDER BY n.title",
        )
        .map_err(|e| e.to_string())?;
    let links = stmt
        .query_map(rusqlite::params![note_id], |row| {
            Ok(LinkInfo {
                note_id: row.get(0)?,
                note_title: row.get(1)?,
                note_slug: row.get(2)?,
                link_text: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(links)
}

// ---------------------------------------------------------------------------
// Tauri Commands (12 total)
// ---------------------------------------------------------------------------

const NOTE_SELECT: &str =
    "SELECT id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at";

#[tauri::command]
pub fn create_note(
    state: State<AppState>,
    title: Option<String>,
    folder_id: Option<String>,
    tags: Option<String>,
) -> Result<Note, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let title = title.unwrap_or_else(|| "Untitled".to_string());
    let slug = unique_slug(&db.conn, &title)?;
    let content = String::new();
    let tags = tags.unwrap_or_default();
    let frontmatter = "{}".to_string();
    let pinned = 0;
    let position: i32 = db
        .conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM notes WHERE folder_id IS ?1",
            rusqlite::params![folder_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let position = position + 1;
    let word_count = 0;
    let now = chrono::Utc::now().to_rfc3339();

    db.conn
        .execute(
            "INSERT INTO notes (id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            rusqlite::params![id, title, slug, content, folder_id, tags, frontmatter, pinned, position, word_count, now, now],
        )
        .map_err(|e| e.to_string())?;

    Ok(Note {
        id,
        title,
        slug,
        content,
        folder_id,
        tags,
        frontmatter,
        pinned,
        position,
        word_count,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_note(state: State<AppState>, id_or_slug: String) -> Result<NoteWithRelations, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Try lookup by ID first, then by slug
    let note = note_from_query(
        &db.conn,
        &format!("{} FROM notes WHERE id = ?1", NOTE_SELECT),
        &[&id_or_slug as &dyn rusqlite::types::ToSql],
    )
    .or_else(|_| {
        note_from_query(
            &db.conn,
            &format!("{} FROM notes WHERE slug = ?1", NOTE_SELECT),
            &[&id_or_slug as &dyn rusqlite::types::ToSql],
        )
    })?;

    let backlinks = fetch_backlinks(&db.conn, &note.id)?;
    let outbound_links = fetch_outbound_links(&db.conn, &note.id)?;

    Ok(NoteWithRelations {
        note,
        backlinks,
        outbound_links,
    })
}

#[tauri::command]
pub fn update_note(
    state: State<AppState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
    tags: Option<String>,
    frontmatter: Option<String>,
    pinned: Option<i32>,
) -> Result<Note, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Fetch current note
    let current = note_from_query(
        &db.conn,
        &format!("{} FROM notes WHERE id = ?1", NOTE_SELECT),
        &[&id as &dyn rusqlite::types::ToSql],
    )?;

    let title = title.unwrap_or_else(|| current.title.clone());
    let content = content.unwrap_or_else(|| current.content.clone());
    let tags = tags.unwrap_or_else(|| current.tags.clone());
    let frontmatter = frontmatter.unwrap_or_else(|| current.frontmatter.clone());
    let pinned = pinned.unwrap_or(current.pinned);
    let word_count = count_words(&content);

    // Regenerate slug if title changed
    let slug = if title != current.title {
        unique_slug(&db.conn, &title)?
    } else {
        current.slug.clone()
    };

    let now = chrono::Utc::now().to_rfc3339();

    db.conn
        .execute(
            "UPDATE notes SET title = ?1, slug = ?2, content = ?3, tags = ?4, frontmatter = ?5, pinned = ?6, word_count = ?7, updated_at = ?8 WHERE id = ?9",
            rusqlite::params![title, slug, content, tags, frontmatter, pinned, word_count, now, id],
        )
        .map_err(|e| e.to_string())?;

    // Rebuild wikilinks in background so save returns immediately
    if content != current.content {
        let db_path = db.path.clone();
        let note_id = id.clone();
        let content_bg = content.clone();
        std::thread::spawn(move || {
            match rusqlite::Connection::open(&db_path) {
                Ok(conn) => {
                    if let Err(e) = update_note_links(&conn, &note_id, &content_bg) {
                        eprintln!("Background wikilink rebuild failed: {}", e);
                    }
                }
                Err(e) => eprintln!("Background wikilink: failed to open DB: {}", e),
            }
        });
    }

    Ok(Note {
        id,
        title,
        slug,
        content,
        folder_id: current.folder_id,
        tags,
        frontmatter,
        pinned,
        position: current.position,
        word_count,
        created_at: current.created_at,
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_note(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // note_links cascade-deletes via FK
    db.conn
        .execute("DELETE FROM notes WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn trash_note(state: State<AppState>, id: String) -> Result<Note, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.conn
        .execute(
            "UPDATE notes SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            rusqlite::params![now, id],
        )
        .map_err(|e| format!("Failed to trash note: {}", e))?;
    note_from_query(
        &db.conn,
        &format!("{} FROM notes WHERE id = ?1", NOTE_SELECT),
        &[&id as &dyn rusqlite::types::ToSql],
    )
}

#[tauri::command]
pub fn restore_note(state: State<AppState>, id: String) -> Result<Note, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute(
            "UPDATE notes SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![chrono::Utc::now().to_rfc3339(), id],
        )
        .map_err(|e| format!("Failed to restore note: {}", e))?;
    note_from_query(
        &db.conn,
        &format!("{} FROM notes WHERE id = ?1", NOTE_SELECT),
        &[&id as &dyn rusqlite::types::ToSql],
    )
}

#[tauri::command]
pub fn empty_trash(state: State<AppState>) -> Result<i32, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let count: i32 = db
        .conn
        .query_row(
            "SELECT COUNT(*) FROM notes WHERE deleted_at IS NOT NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM notes WHERE deleted_at IS NOT NULL", [])
        .map_err(|e| format!("Failed to empty trash: {}", e))?;
    Ok(count)
}

#[tauri::command]
pub fn list_trash_notes(state: State<AppState>) -> Result<Vec<Note>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(&format!(
            "{} FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
            NOTE_SELECT
        ))
        .map_err(|e| e.to_string())?;
    let notes = stmt
        .query_map([], row_to_note)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(notes)
}

#[tauri::command]
pub fn list_notes(
    state: State<AppState>,
    folder_id: Option<String>,
    tag: Option<String>,
    search: Option<String>,
) -> Result<Vec<Note>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut sql = format!("{} FROM notes WHERE deleted_at IS NULL", NOTE_SELECT);
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref fid) = folder_id {
        sql.push_str(" AND folder_id = ?");
        params.push(Box::new(fid.clone()));
    }
    if let Some(ref t) = tag {
        sql.push_str(" AND tags LIKE ?");
        params.push(Box::new(format!("%{}%", t)));
    }
    if let Some(ref s) = search {
        sql.push_str(" AND (title LIKE ? OR content LIKE ?)");
        let pattern = format!("%{}%", s);
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern));
    }

    sql.push_str(" ORDER BY pinned DESC, position ASC, updated_at DESC");

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = db.conn.prepare(&sql).map_err(|e| e.to_string())?;
    let notes = stmt
        .query_map(param_refs.as_slice(), row_to_note)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(notes)
}

#[tauri::command]
pub fn list_root_notes(state: State<AppState>) -> Result<Vec<Note>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(&format!(
            "{} FROM notes WHERE folder_id IS NULL AND deleted_at IS NULL ORDER BY pinned DESC, position ASC, updated_at DESC",
            NOTE_SELECT
        ))
        .map_err(|e| e.to_string())?;
    let notes = stmt
        .query_map([], row_to_note)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(notes)
}

#[tauri::command]
pub fn list_notes_in_folder(state: State<AppState>, folder_id: String) -> Result<Vec<Note>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(&format!(
            "{} FROM notes WHERE folder_id = ?1 AND deleted_at IS NULL ORDER BY pinned DESC, position ASC, updated_at DESC",
            NOTE_SELECT
        ))
        .map_err(|e| e.to_string())?;
    let notes = stmt
        .query_map(rusqlite::params![folder_id], row_to_note)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(notes)
}

#[tauri::command]
pub fn move_note(state: State<AppState>, id: String, folder_id: Option<String>) -> Result<Note, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Assign next available position in the destination folder
    let max_pos: i32 = db
        .conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM notes WHERE folder_id IS ?1",
            rusqlite::params![folder_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let new_position = max_pos + 1;

    db.conn
        .execute(
            "UPDATE notes SET folder_id = ?1, position = ?2, updated_at = ?3 WHERE id = ?4",
            rusqlite::params![folder_id, new_position, now, id],
        )
        .map_err(|e| e.to_string())?;
    note_from_query(
        &db.conn,
        &format!("{} FROM notes WHERE id = ?1", NOTE_SELECT),
        &[&id as &dyn rusqlite::types::ToSql],
    )
}

#[tauri::command]
pub fn move_notes(
    state: State<AppState>,
    ids: Vec<String>,
    folder_id: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Calculate starting position (all notes go after existing notes in target folder)
    let base_pos: i32 = db
        .conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM notes WHERE folder_id IS ?1",
            rusqlite::params![folder_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let base_pos = base_pos + 1;

    for (i, id) in ids.iter().enumerate() {
        db.conn
            .execute(
                "UPDATE notes SET folder_id = ?1, position = ?2, updated_at = ?3 WHERE id = ?4",
                rusqlite::params![folder_id, base_pos + i as i32, now, id],
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn reorder_notes(state: State<AppState>, items: Vec<ReorderItem>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    for item in &items {
        db.conn
            .execute(
                "UPDATE notes SET position = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![item.position, now, item.id],
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_backlinks(state: State<AppState>, note_id: String) -> Result<Vec<LinkInfo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    fetch_backlinks(&db.conn, &note_id)
}

#[tauri::command]
pub fn search_notes(state: State<AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", query);
    let mut stmt = db
        .conn
        .prepare(
            "SELECT id, title, slug, content, tags FROM notes WHERE title LIKE ?1 OR content LIKE ?1 ORDER BY updated_at DESC LIMIT 20",
        )
        .map_err(|e| e.to_string())?;
    let results = stmt
        .query_map(rusqlite::params![pattern], |row| {
            let content: String = row.get(3)?;
            let snippet = if content.len() > 100 {
                format!("{}...", &content[..100])
            } else {
                content.clone()
            };
            Ok(SearchResult {
                id: row.get(0)?,
                title: row.get(1)?,
                slug: row.get(2)?,
                snippet,
                tags: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
pub fn toggle_pin_note(state: State<AppState>, id: String) -> Result<Note, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Get current pinned state
    let current_pinned: i32 = db
        .conn
        .query_row(
            "SELECT pinned FROM notes WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let new_pinned = if current_pinned == 0 { 1 } else { 0 };
    let now = chrono::Utc::now().to_rfc3339();

    db.conn
        .execute(
            "UPDATE notes SET pinned = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![new_pinned, now, id],
        )
        .map_err(|e| e.to_string())?;

    note_from_query(
        &db.conn,
        &format!("{} FROM notes WHERE id = ?1", NOTE_SELECT),
        &[&id as &dyn rusqlite::types::ToSql],
    )
}

#[tauri::command]
pub fn save_note_image(state: State<AppState>, source_path: String) -> Result<String, String> {
    // Get app data dir from db path (db.path is the full path to worf.db)
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let app_dir = db.path.parent().ok_or("Failed to get app data directory")?;
    let img_dir = app_dir.join("notes").join("images");

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&img_dir).map_err(|e| format!("Failed to create images dir: {}", e))?;

    // Generate unique filename preserving extension
    let ext = source_path.rsplit('.').next().unwrap_or("png");
    let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    let dest = img_dir.join(&filename);

    // OS-level copy (fast, no JS memory round-trip)
    std::fs::copy(&source_path, &dest).map_err(|e| format!("Failed to copy image: {}", e))?;

    Ok(filename)
}

#[tauri::command]
pub fn get_note_image(state: State<AppState>, filename: String) -> Result<Vec<u8>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let app_dir = db.path.parent().ok_or("Failed to get app data directory")?;
    let img_path = app_dir.join("notes").join("images").join(&filename);

    std::fs::read(&img_path).map_err(|e| format!("Failed to read image '{}': {}", filename, e))
}

#[tauri::command]
pub fn ensure_draft_folder(state: State<AppState>) -> Result<Folder, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Check settings for existing draft folder ID
    let draft_id: Option<String> = db
        .conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'draft_folder_id'",
            [],
            |row| row.get(0),
        )
        .ok();

    // If we have a stored ID, verify the folder still exists
    if let Some(ref id) = draft_id {
        let existing = db.conn.query_row(
            "SELECT id, name, position, created_at, updated_at FROM folders WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(crate::commands::folders::Folder {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    position: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        );
        if let Ok(folder) = existing {
            return Ok(folder);
        }
    }

    // Create new Draft folder
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
            "INSERT INTO folders (id, name, position, created_at, updated_at) VALUES (?1, 'Draft', ?2, ?3, ?4)",
            rusqlite::params![id, position, now, now],
        )
        .map_err(|e| e.to_string())?;

    // Store the draft folder ID in settings
    let settings_id = uuid::Uuid::new_v4().to_string();
    db.conn
        .execute(
            "INSERT OR REPLACE INTO settings (id, key, value, created_at, updated_at) VALUES (?1, 'draft_folder_id', ?2, ?3, ?4)",
            rusqlite::params![settings_id, id, now, now],
        )
        .map_err(|e| e.to_string())?;

    Ok(crate::commands::folders::Folder {
        id,
        name: "Draft".to_string(),
        position,
        created_at: now.clone(),
        updated_at: now,
    })
}