use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

// ── URL Fetching ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FetchResult {
    pub url: String,
    pub title: String,
    pub content: String,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn fetch_urls(urls: Vec<String>) -> Result<Vec<FetchResult>, String> {
    let mut results = Vec::new();

    for url in urls {
        let result = fetch_single_url(&url).await;
        results.push(result);
    }

    Ok(results)
}

fn normalize_url(url: &str) -> String {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        format!("https://{}", url)
    } else {
        url.to_string()
    }
}

async fn fetch_single_url(url: &str) -> FetchResult {
    let normalized_url = normalize_url(url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (compatible; WorfZ/1.0; +https://github.com/worf-z)")
        .build();

    let client = match client {
        Ok(c) => c,
        Err(e) => {
            return FetchResult {
                url: normalized_url,
                title: String::new(),
                content: String::new(),
                error: Some(format!("Failed to create HTTP client: {}", e)),
            };
        }
    };

    let response = client.get(&normalized_url).send().await;

    let response = match response {
        Ok(r) => r,
        Err(e) => {
            return FetchResult {
                url: normalized_url,
                title: String::new(),
                content: String::new(),
                error: Some(format!("Failed to fetch URL: {}", e)),
            };
        }
    };

    let status = response.status();
    if !status.is_success() {
        return FetchResult {
            url: normalized_url,
            title: String::new(),
            content: String::new(),
            error: Some(format!("HTTP error: {} {}", status.as_u16(), status.as_str())),
        };
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    // Only process HTML pages
    if !content_type.contains("text/html") && !content_type.contains("text/plain") {
        return FetchResult {
            url: normalized_url,
            title: String::new(),
            content: String::new(),
            error: Some(format!("Unsupported content type: {}", content_type)),
        };
    }

    let html = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return FetchResult {
                url: normalized_url,
                title: String::new(),
                content: String::new(),
                error: Some(format!("Failed to read response body: {}", e)),
            };
        }
    };

    let (title, content) = extract_content(&html);

    FetchResult {
        url: normalized_url,
        title,
        content,
        error: None,
    }
}

fn extract_content(html: &str) -> (String, String) {
    // Extract title from <title> tag
    let title = extract_tag_content(html, "title")
        .map(|t| html_unescape(&t))
        .unwrap_or_default();

    // Extract meta description
    let meta_desc = extract_meta_description(html);

    // Extract text from body (strip all HTML tags)
    let body_text = extract_body_text(html);

    // Combine: use meta description as intro if available, then body text
    let mut content = String::new();

    if let Some(desc) = meta_desc {
        if !desc.is_empty() {
            content.push_str(&html_unescape(&desc));
            content.push_str("\n\n");
        }
    }

    // Clean up body text (collapse whitespace, remove empty lines)
    let cleaned = body_text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    content.push_str(&cleaned);

    // Truncate to 5000 chars
    if content.len() > 5000 {
        content.truncate(5000);
        content.push_str("\n\n[Content truncated...]");
    }

    (title, content)
}

fn extract_tag_content(html: &str, tag: &str) -> Option<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);

    if let Some(start) = html.find(&open) {
        let after_open = start + open.len();
        if let Some(end) = html[after_open..].find(&close) {
            return Some(html[after_open..after_open + end].to_string());
        }
    }

    // Also try with attributes: <title ...>
    let open_pattern = format!("<{} ", tag);
    if let Some(start) = html.find(&open_pattern) {
        // Find the closing > of the opening tag
        if let Some(gt) = html[start..].find('>') {
            let after_open = start + gt + 1;
            if let Some(end) = html[after_open..].find(&close) {
                return Some(html[after_open..after_open + end].to_string());
            }
        }
    }

    None
}

fn extract_meta_description(html: &str) -> Option<String> {
    // Look for <meta name="description" content="...">
    let patterns = [
        r#"name="description" content=""#,
        r#"name='description' content='"#,
        r#"name=description content=""#,
        r#"property="og:description" content=""#,
        r#"property='og:description' content='"#,
    ];

    for pattern in &patterns {
        if let Some(start) = html.find(pattern) {
            let after = start + pattern.len();
            let mut value = String::new();
            let chars: Vec<char> = html[after..].chars().collect();
            for &c in &chars {
                if c == '"' || c == '\'' {
                    break;
                }
                value.push(c);
            }
            if !value.is_empty() {
                return Some(value);
            }
        }
    }

    None
}

fn extract_body_text(html: &str) -> String {
    // Find body content
    let body_start = html.find("<body").and_then(|s| {
        html[s..].find('>').map(|gt| s + gt + 1)
    }).unwrap_or(0);

    let body_end = html[body_start..].find("</body>").map(|e| body_start + e).unwrap_or(html.len());

    let body = &html[body_start..body_end];

    // Remove scripts and styles
    let cleaned = remove_tag_sections(body, "script");
    let cleaned = remove_tag_sections(&cleaned, "style");
    let cleaned = remove_tag_sections(&cleaned, "noscript");
    let cleaned = remove_tag_sections(&cleaned, "nav");
    let cleaned = remove_tag_sections(&cleaned, "footer");
    let cleaned = remove_tag_sections(&cleaned, "header");

    // Strip remaining HTML tags
    let mut text = String::new();
    let mut in_tag = false;
    let mut in_entity = false;
    let mut entity_buf = String::new();

    for c in cleaned.chars() {
        match c {
            '<' => {
                in_tag = true;
            }
            '>' if in_tag => {
                in_tag = false;
                // Add newline after block-level tags
                text.push('\n');
            }
            '&' if !in_tag => {
                in_entity = true;
                entity_buf.clear();
                entity_buf.push(c);
            }
            ';' if in_entity => {
                in_entity = false;
                entity_buf.push(c);
                // Decode common entities
                let decoded = match entity_buf.as_str() {
                    "&amp;" => "&",
                    "&lt;" => "<",
                    "&gt;" => ">",
                    "&quot;" => "\"",
                    "&#39;" => "'",
                    "&nbsp;" => " ",
                    _ => &entity_buf,
                };
                text.push_str(decoded);
            }
            _ if !in_tag && !in_entity => {
                text.push(c);
            }
            _ if in_entity => {
                entity_buf.push(c);
            }
            _ => {}
        }
    }

    text
}

fn remove_tag_sections(html: &str, tag: &str) -> String {
    let mut result = String::new();
    let mut pos = 0;

    let open_tags = [format!("<{}>", tag), format!("<{} ", tag)];
    let close_tag = format!("</{}>", tag);

    while pos < html.len() {
        let rest = &html[pos..];

        // Find the next opening tag
        let tag_start = open_tags.iter().filter_map(|ot| rest.find(ot)).min();

        let tag_start = match tag_start {
            Some(s) => s,
            None => {
                // No more opening tags, append remaining
                result.push_str(rest);
                break;
            }
        };

        // Copy everything before the tag
        result.push_str(&rest[..tag_start]);

        // Find the closing </tag>
        let after_open = pos + tag_start;
        let section = &html[after_open..];

        let end = section
            .find(&close_tag)
            .map(|e| e + close_tag.len())
            .unwrap_or(section.len());

        pos = after_open + end;
    }

    result
}

fn html_unescape(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&#x27;", "'")
        .replace("&#x2F;", "/")
        .replace("&nbsp;", " ")
}

// ── URL Context Persistence (message_url_contexts table) ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UrlContext {
    pub id: String,
    pub message_id: String,
    pub url: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
}

#[tauri::command]
pub fn save_url_contexts(
    state: State<AppState>,
    message_id: String,
    contexts: Vec<FetchResult>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    for ctx in contexts {
        let id = uuid::Uuid::new_v4().to_string();
        let content = ctx.content;

        // Skip entries with errors
        if ctx.error.is_some() {
            continue;
        }

        db.conn
            .execute(
                "INSERT INTO message_url_contexts (id, message_id, url, title, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![id, message_id, ctx.url, ctx.title, content, now],
            )
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_url_contexts(
    state: State<AppState>,
    message_id: String,
) -> Result<Vec<UrlContext>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(
            "SELECT id, message_id, url, title, content, created_at FROM message_url_contexts WHERE message_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let contexts = stmt
        .query_map(rusqlite::params![message_id], |row| {
            Ok(UrlContext {
                id: row.get(0)?,
                message_id: row.get(1)?,
                url: row.get(2)?,
                title: row.get(3)?,
                content: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(contexts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_tag_content() {
        let html = "<html><head><title>Test Page</title></head><body><p>Hello</p></body></html>";
        let title = extract_tag_content(html, "title");
        assert_eq!(title, Some("Test Page".to_string()));
    }

    #[test]
    fn test_extract_tag_content_with_attributes() {
        let html = r#"<html><head><title data-something="val">My Title</title></head></html>"#;
        let title = extract_tag_content(html, "title");
        assert_eq!(title, Some("My Title".to_string()));
    }

    #[test]
    fn test_extract_meta_description() {
        let html = r#"<meta name="description" content="This is a great product" />"#;
        let desc = extract_meta_description(html);
        assert_eq!(desc, Some("This is a great product".to_string()));
    }

    #[test]
    fn test_extract_og_description() {
        let html = r#"<meta property="og:description" content="Open graph desc" />"#;
        let desc = extract_meta_description(html);
        assert_eq!(desc, Some("Open graph desc".to_string()));
    }

    #[test]
    fn test_extract_body_text_strips_tags() {
        let html = "<html><body><h1>Heading</h1><p>Paragraph text.</p><ul><li>Item 1</li><li>Item 2</li></ul></body></html>";
        let text = extract_body_text(html);
        assert!(text.contains("Heading"));
        assert!(text.contains("Paragraph text."));
        assert!(text.contains("Item 1"));
        assert!(text.contains("Item 2"));
        assert!(!text.contains("<h1>"));
        assert!(!text.contains("</li>"));
    }

    #[test]
    fn test_extract_body_text_removes_scripts() {
        let html = "<html><body><p>Hello</p><script>alert('xss');</script><p>World</p></body></html>";
        let text = extract_body_text(html);
        assert!(text.contains("Hello"));
        assert!(text.contains("World"));
        assert!(!text.contains("alert"));
    }

    #[test]
    fn test_extract_content_includes_title_and_body() {
        let html = r#"<html><head><title>ProductX</title><meta name="description" content="Amazing product platform" /></head><body><h1>Welcome</h1><p>ProductX is a platform for teams.</p></body></html>"#;
        let (title, content) = extract_content(html);
        assert_eq!(title, "ProductX");
        assert!(content.contains("Amazing product platform"));
        assert!(content.contains("ProductX is a platform for teams."));
    }

    #[test]
    fn test_content_truncation() {
        let long_text = "A".repeat(6000);
        let html = format!("<html><head><title>Long</title></head><body><p>{}</p></body></html>", long_text);
        let (_title, content) = extract_content(&html);
        assert!(content.len() <= 5025); // ~5000 + "[Content truncated...]\n"
        assert!(content.ends_with("[Content truncated...]"));
    }

    #[test]
    fn test_html_unescape() {
        assert_eq!(html_unescape("Tom &amp; Jerry"), "Tom & Jerry");
        assert_eq!(html_unescape("&lt;script&gt;"), "<script>");
        assert_eq!(html_unescape("&quot;Hello&quot;"), "\"Hello\"");
    }

    #[test]
    fn test_normalize_url() {
        assert_eq!(normalize_url("https://example.com"), "https://example.com");
        assert_eq!(normalize_url("http://example.com"), "http://example.com");
        assert_eq!(normalize_url("example.com"), "https://example.com");
        assert_eq!(normalize_url("productx.com/page"), "https://productx.com/page");
    }

    #[test]
    fn test_remove_script_sections() {
        let html = "<html><body><p>Hello</p><script>alert('xss');</script><p>World</p></body></html>";
        let result = remove_tag_sections(html, "script");
        assert!(!result.contains("<script>"));
        assert!(!result.contains("alert"));
        assert!(result.contains("<p>Hello</p>"));
        assert!(result.contains("<p>World</p>"));
    }

    #[test]
    fn test_remove_nav_section() {
        let html = "<body><nav><a href='#'>Link</a></nav><p>Content</p></body>";
        let result = remove_tag_sections(html, "nav");
        assert!(!result.contains("<nav>"));
        assert!(result.contains("<p>Content</p>"));
    }
}
