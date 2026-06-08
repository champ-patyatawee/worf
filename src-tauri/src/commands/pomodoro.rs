use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize)]
pub struct PomodoroState {
    pub mode: String,
    pub is_running: bool,
    pub time_left: u64,
    pub work_duration: u64,
    pub break_duration: u64,
}

pub struct PomodoroManager {
    pub state: Mutex<PomodoroState>,
}

impl PomodoroManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(PomodoroState {
                mode: "work".into(),
                is_running: false,
                time_left: 25 * 60,
                work_duration: 25 * 60,
                break_duration: 5 * 60,
            }),
        }
    }
}

#[tauri::command]
pub fn get_pomodoro_state(manager: tauri::State<PomodoroManager>) -> Result<PomodoroState, String> {
    let state = manager.state.lock().map_err(|e| e.to_string())?;
    Ok(state.clone())
}

#[tauri::command]
pub fn start_pomodoro(
    app: AppHandle,
    manager: tauri::State<PomodoroManager>,
    work_minutes: u64,
    break_minutes: u64,
) -> Result<(), String> {
    {
        let mut state = manager.state.lock().map_err(|e| e.to_string())?;
        state.is_running = true;
        state.mode = "work".into();
        state.time_left = work_minutes * 60;
        state.work_duration = work_minutes * 60;
        state.break_duration = break_minutes * 60;
    }

    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(1));

            let manager = app.state::<PomodoroManager>();
            let mut state = match manager.state.lock() {
                Ok(s) => s,
                Err(_) => return,
            };

            if !state.is_running {
                return;
            }

            if state.time_left <= 1 {
                // Timer complete — stop briefly
                state.is_running = false;
                drop(state);

                // Play system sound on macOS
                let _ = thread::spawn(|| {
                    std::process::Command::new("afplay")
                        .arg("/System/Library/Sounds/Ping.aiff")
                        .output()
                        .ok();
                });

                // Notify frontend
                let _ = app.emit("pomodoro-complete", ());

                // Brief pause before auto-continuing
                thread::sleep(Duration::from_millis(100));

                let mut state = match manager.state.lock() {
                    Ok(s) => s,
                    Err(_) => return,
                };

                // If user already manually stopped, don't auto-start
                if state.is_running {
                    return;
                }

                // Switch session
                if state.mode == "work" {
                    state.mode = "break".into();
                    state.time_left = state.break_duration;
                } else {
                    state.mode = "work".into();
                    state.time_left = state.work_duration;
                }
                state.is_running = true;

                let tick = state.clone();
                drop(state);
                let _ = app.emit("pomodoro-tick", tick);
            } else {
                state.time_left -= 1;
                let tick = state.clone();
                drop(state);
                let _ = app.emit("pomodoro-tick", tick);
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn stop_pomodoro(manager: tauri::State<PomodoroManager>) -> Result<(), String> {
    let mut state = manager.state.lock().map_err(|e| e.to_string())?;
    state.is_running = false;
    Ok(())
}
