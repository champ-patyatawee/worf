mod commands;
mod db;

use db::Database;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;

struct AppState {
    pub db: Mutex<Database>,
    pub terminal_tabs: Mutex<HashMap<String, commands::terminal::TabEntry>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());

    #[cfg(feature = "webdriver")]
    let builder = builder.plugin(tauri_plugin_webdriver::init());

    builder
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");

            let database = Database::new(&app_dir).expect("failed to initialize database");
            app.manage(AppState {
                db: Mutex::new(database),
                terminal_tabs: Mutex::new(HashMap::new()),
            });
            app.manage(commands::pomodoro::PomodoroManager::new());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Boards
            commands::boards::create_board,
            commands::boards::list_boards,
            commands::boards::get_board,
            commands::boards::delete_board,
            // Tasks
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::tasks::move_task,
            // Providers
            commands::providers::list_providers,
            commands::providers::create_provider,
            commands::providers::update_provider,
            commands::providers::delete_provider,
            commands::providers::get_setting,
            commands::providers::set_setting,
            // Chat sessions
            commands::chats::list_chat_sessions,
            commands::chats::create_chat_session,
            commands::chats::update_chat_session,
            commands::chats::delete_chat_session,
            commands::chats::get_chat_messages,
            commands::chats::create_chat_message,
            // Prompt templates
            commands::chats::list_prompt_templates,
            commands::chats::create_prompt_template,
            commands::chats::update_prompt_template,
            commands::chats::delete_prompt_template,
            // URL fetching
            commands::url_fetch::fetch_urls,
            commands::url_fetch::save_url_contexts,
            commands::url_fetch::get_url_contexts,
            // Pomodoro
            commands::pomodoro::get_pomodoro_state,
            commands::pomodoro::start_pomodoro,
            commands::pomodoro::stop_pomodoro,
            // Notes
            commands::notes::create_note,
            commands::notes::get_note,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::notes::list_notes,
            commands::notes::list_root_notes,
            commands::notes::list_notes_in_folder,
            commands::notes::move_note,
            commands::notes::move_notes,
            
            commands::notes::get_backlinks,
            commands::notes::search_notes,
            commands::notes::reorder_notes,
            commands::notes::toggle_pin_note,
            commands::notes::ensure_draft_folder,
            // Folders
            commands::folders::list_folders,
            commands::folders::create_folder,
            commands::folders::rename_folder,
            commands::folders::delete_folder,
            commands::folders::reorder_folders,
            // Terminal
            commands::terminal::create_terminal_tab,
            commands::terminal::terminal_write,
            commands::terminal::resize_terminal,
            commands::terminal::close_terminal_tab,
            commands::terminal::list_terminal_tabs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
