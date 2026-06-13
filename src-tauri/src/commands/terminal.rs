use crate::AppState;
use portable_pty::{ChildKiller, CommandBuilder, MasterPty, PtySize, SlavePty, native_pty_system};
use serde::Serialize;
use std::io::{Read, Write};
use tauri::{AppHandle, Emitter, State};

#[cfg(unix)]
use libc;

// ── Public types ──

/// Information about a terminal tab, returned to the frontend.
#[derive(Debug, Serialize, Clone)]
pub struct TerminalTab {
    pub id: String,
    pub pid: u32,
    pub title: String,
}

/// Internal PTY state (same as before, kept internal).
pub struct PtyState {
    /// The master PTY handle (used for resize).
    master: Box<dyn MasterPty + Send>,
    /// A handle that can kill the child process from any thread.
    killer: Box<dyn ChildKiller + Send + Sync>,
    /// Writer end of the PTY (send input to the shell).
    writer: Box<dyn Write + Send>,
    /// Background thread reading PTY output and emitting events.
    reader_handle: Option<std::thread::JoinHandle<()>>,
}

/// Wrapper that pairs a PtyState with tab metadata, stored in AppState.
pub struct TabEntry {
    pub pty: PtyState,
    pub pid: u32,
    pub title: String,
}

// ── Event payloads ──

#[derive(Clone, Serialize)]
struct TerminalOutput {
    tab_id: String,
    data: String,
}

#[derive(Clone, Serialize)]
struct TerminalExited {
    tab_id: String,
    code: Option<i32>,
}

// ── Commands ──

/// Create a new terminal tab by spawning the user's shell in a PTY.
#[tauri::command]
pub fn create_terminal_tab(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<TerminalTab, String> {
    let tab_id = uuid::Uuid::new_v4().to_string();

    // Determine initial PTY size
    let rows: u16 = 24;
    let cols: u16 = 80;
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    // Create PTY via portable_pty
    let pty_system = native_pty_system();
    let pair = pty_system.openpty(size).map_err(|e| e.to_string())?;

    let master: Box<dyn MasterPty + Send> = pair.master;
    let slave: Box<dyn SlavePty + Send> = pair.slave;

    // Build the command to spawn
    let cmd = build_shell_command();
    let child = match slave.spawn_command(cmd) {
        Ok(c) => c,
        Err(e) => {
            // If login+interactive spawn fails, try fallback without -l
            eprintln!(
                "[terminal] login shell spawn failed: {}, retrying with fallback",
                e
            );
            let fallback_cmd = build_shell_command_fallback();
            slave.spawn_command(fallback_cmd).map_err(|e2| {
                format!("terminal spawn failed (login: {}, fallback: {})", e, e2)
            })?
        }
    };

    let pid = child.process_id().unwrap_or(0);
    let killer = child.clone_killer();

    eprintln!(
        "[terminal] tab created: id={}, pid={}, shell={}",
        tab_id,
        pid,
        std::env::var("SHELL").unwrap_or_else(|_| "unknown".to_string())
    );

    // Obtain reader and writer from the master PTY
    let reader = master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = master.take_writer().map_err(|e| e.to_string())?;

    // Spawn background reader thread — clone tab_id before moving into thread
    let emit_handle = app_handle.clone();
    let thread_tab_id = tab_id.clone();
    let reader_handle = std::thread::spawn(move || {
        eprintln!("[terminal] reader started for tab: id={}", thread_tab_id);
        // Move child into the thread so we can wait for exit after reading EOF
        let mut child = child;
        let mut reader = reader;
        let mut buf = vec![0u8; 4096];

        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    break;
                }
                Ok(n) => {
                    eprintln!("[terminal] event emitted: tab={}, bytes={}", thread_tab_id, n);
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = emit_handle.emit(
                        "terminal-output",
                        TerminalOutput {
                            tab_id: thread_tab_id.clone(),
                            data,
                        },
                    );
                }
                Err(e) => {
                    eprintln!("[terminal:{}] read error: {}", thread_tab_id, e);
                    break;
                }
            }
        }

        // Process has exited — get exit code and emit event
        let exit_code = child.wait().ok().map(|s| s.exit_code() as i32);
        eprintln!("[terminal] exited: tab={}, code={:?}", thread_tab_id, exit_code);
        let _ = emit_handle.emit(
            "terminal-exited",
            TerminalExited {
                tab_id: thread_tab_id,
                code: exit_code,
            },
        );
    });

    // Determine tab title based on current tab count
    let mut tabs = state.terminal_tabs.lock().map_err(|e| e.to_string())?;
    let tab_count = tabs.len() + 1;
    let title = format!("Terminal {}", tab_count);

    tabs.insert(
        tab_id.clone(),
        TabEntry {
            pty: PtyState {
                master,
                killer,
                writer,
                reader_handle: Some(reader_handle),
            },
            pid,
            title: title.clone(),
        },
    );

    Ok(TerminalTab {
        id: tab_id,
        pid,
        title,
    })
}

/// Write data (keystrokes, pasted text, etc.) into the PTY for a specific tab.
#[tauri::command]
pub fn terminal_write(
    state: State<'_, AppState>,
    tab_id: String,
    data: String,
) -> Result<(), String> {
    eprintln!(
        "[terminal] write: tab={}, bytes={}, preview={:?}",
        tab_id,
        data.len(),
        &data.as_bytes()[..data.len().min(50)]
    );
    let mut tabs = state.terminal_tabs.lock().map_err(|e| e.to_string())?;
    let entry = tabs
        .get_mut(&tab_id)
        .ok_or_else(|| "Terminal tab not found".to_string())?;

    entry
        .pty
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to terminal: {}", e))?;
    entry
        .pty
        .writer
        .flush()
        .map_err(|e| format!("Failed to flush terminal: {}", e))?;

    Ok(())
}

/// Resize the PTY (typically called when the xterm.js container resizes).
#[tauri::command]
pub fn resize_terminal(
    state: State<'_, AppState>,
    tab_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    eprintln!("[terminal] resize: tab={}, rows={}, cols={}", tab_id, rows, cols);
    let tabs = state.terminal_tabs.lock().map_err(|e| e.to_string())?;
    let entry = tabs
        .get(&tab_id)
        .ok_or_else(|| "Terminal tab not found".to_string())?;

    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };
    entry
        .pty
        .master
        .resize(size)
        .map_err(|e| e.to_string())?;

    // ── macOS SIGWINCH delivery ──
    //
    // After TIOCSWINSZ updates the kernel window size, macOS sends SIGWINCH
    // to the foreground process group of the controlling terminal (the one
    // returned by tcgetpgrp()).  When a foreground app like vim or less is
    // running, that process group is different from the shell's PID.
    //
    // We use portable-pty's process_group_leader() (which calls tcgetpgrp()
    // on the master PTY fd) to discover the actual foreground process group
    // and send SIGWINCH there — the same approach VS Code's node-pty uses.
    #[cfg(unix)]
    {
        match entry.pty.master.process_group_leader() {
            Some(pgid) if pgid > 0 => {
                eprintln!(
                    "[terminal] sending SIGWINCH to foreground process group {}",
                    pgid
                );
                let result = unsafe { libc::killpg(pgid, libc::SIGWINCH) };
                if result != 0 {
                    eprintln!(
                        "[terminal] killpg({}, SIGWINCH) failed: {}",
                        pgid,
                        std::io::Error::last_os_error()
                    );
                }
            }
            _ => {
                eprintln!("[terminal] tcgetpgrp returned empty — SIGWINCH not sent");
            }
        }
    }

    Ok(())
}

/// Close a terminal tab: kill the process, join the reader thread, remove from state.
#[tauri::command]
pub fn close_terminal_tab(state: State<'_, AppState>, tab_id: String) -> Result<(), String> {
    let mut tabs = state.terminal_tabs.lock().map_err(|e| e.to_string())?;
    let mut entry = tabs
        .remove(&tab_id)
        .ok_or_else(|| "Terminal tab not found".to_string())?;

    // Kill the child process first, so the reader thread sees EOF and exits
    let _ = entry.pty.killer.kill();

    // Join the reader thread (it will exit after seeing EOF/error from kill)
    if let Some(handle) = entry.pty.reader_handle.take() {
        let _ = handle.join();
    }

    // TabEntry drops here: writer closes (sends EOF), master PTY closes
    Ok(())
}

/// List all active terminal tabs.
#[tauri::command]
pub fn list_terminal_tabs(state: State<'_, AppState>) -> Result<Vec<TerminalTab>, String> {
    let tabs = state.terminal_tabs.lock().map_err(|e| e.to_string())?;
    let tab_list: Vec<TerminalTab> = tabs
        .iter()
        .map(|(id, entry)| TerminalTab {
            id: id.clone(),
            pid: entry.pid,
            title: entry.title.clone(),
        })
        .collect();
    Ok(tab_list)
}

// ── Helpers ──

/// Build a `CommandBuilder` for the user's preferred shell (login + interactive).
fn build_shell_command() -> CommandBuilder {
    let shell = if cfg!(target_os = "windows") {
        std::env::var("SHELL")
            .unwrap_or_else(|_| "cmd.exe".to_string())
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| {
            if cfg!(target_os = "macos") {
                "/bin/zsh".to_string()
            } else {
                "/bin/bash".to_string()
            }
        })
    };

    let mut cmd = CommandBuilder::new(&shell);

    if cfg!(unix) {
        // BOTH -l (login) and -i (interactive) are needed.
        //   -l sources .zprofile / .bash_profile
        //   -i enables interactive mode — critical for zsh startup
        cmd.arg("-l");
        cmd.arg("-i");
        // TERM is essential — tells shell/programs what terminal capabilities exist.
        cmd.env("TERM", "xterm-256color");
        // COLORTERM tells themes (Powerlevel10k, starship) that 24-bit truecolor is supported.
        cmd.env("COLORTERM", "truecolor");
        // TERM_PROGRAM identifies the terminal emulator for compatibility checks.
        cmd.env("TERM_PROGRAM", "xterm.js");
        // LANG/LC_CTYPE ensure proper locale handling for wide character support.
        cmd.env("LANG", "en_US.UTF-8");
        cmd.env("LC_CTYPE", "en_US.UTF-8");
    }

    cmd
}

/// Build a fallback shell command (interactive only, no login/profile sourcing).
/// Used when the full login shell exits quickly with a non-zero code,
/// which can happen if the user's .zprofile or /etc/zprofile has problematic content.
fn build_shell_command_fallback() -> CommandBuilder {
    let shell = if cfg!(target_os = "windows") {
        std::env::var("SHELL").unwrap_or_else(|_| "cmd.exe".to_string())
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| {
            if cfg!(target_os = "macos") {
                "/bin/zsh".to_string()
            } else {
                "/bin/bash".to_string()
            }
        })
    };

    let mut cmd = CommandBuilder::new(&shell);

    if cfg!(unix) {
        cmd.arg("-i"); // interactive only, no -l
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("TERM_PROGRAM", "xterm.js");
        // LANG/LC_CTYPE ensure proper locale handling for wide character support.
        cmd.env("LANG", "en_US.UTF-8");
        cmd.env("LC_CTYPE", "en_US.UTF-8");
    }

    cmd
}

// ── Tests ──

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_terminal_tab_struct() {
        let tab = TerminalTab {
            id: "test-id-123".to_string(),
            pid: 42,
            title: "Terminal 1".to_string(),
        };
        assert_eq!(tab.id, "test-id-123");
        assert_eq!(tab.pid, 42);
        assert_eq!(tab.title, "Terminal 1");
    }

    #[test]
    fn test_build_shell_command_does_not_panic() {
        // Just verify the builder can be created without panicking
        let _cmd = build_shell_command();
    }

    #[test]
    #[cfg(unix)]
    fn test_build_shell_command_has_interactive_flag() {
        let cmd = build_shell_command();
        let argv = cmd.get_argv();
        // argv[0] is the program, remaining are args
        assert!(
            argv.iter().any(|arg| arg == "-i"),
            "Expected -i (interactive) flag in shell command"
        );
        assert!(
            argv.iter().any(|arg| arg == "-l"),
            "Expected -l (login) flag in shell command"
        );
    }

    #[test]
    #[cfg(unix)]
    fn test_build_shell_command_has_term_env() {
        let cmd = build_shell_command();
        let term = cmd.get_env("TERM");
        assert_eq!(
            term,
            Some(std::ffi::OsStr::new("xterm-256color")),
            "TERM env var should be set to xterm-256color"
        );
    }

    #[test]
    #[cfg(unix)]
    fn test_build_shell_command_fallback_no_login() {
        let cmd = build_shell_command_fallback();
        let argv = cmd.get_argv();
        assert!(
            argv.iter().any(|arg| arg == "-i"),
            "Expected -i (interactive) flag in fallback shell command"
        );
        assert!(
            !argv.iter().any(|arg| arg == "-l"),
            "Fallback should NOT have -l (login) flag"
        );
    }

    #[test]
    #[cfg(unix)]
    fn test_build_shell_command_fallback_has_term_env() {
        let cmd = build_shell_command_fallback();
        let term = cmd.get_env("TERM");
        assert_eq!(
            term,
            Some(std::ffi::OsStr::new("xterm-256color")),
            "Fallback should also have TERM=xterm-256color"
        );
    }

    #[test]
    #[cfg(unix)]
    fn test_build_shell_command_has_colorterm_env() {
        let cmd = build_shell_command();
        let val = cmd.get_env("COLORTERM");
        assert_eq!(
            val,
            Some(std::ffi::OsStr::new("truecolor")),
            "COLORTERM should be set to truecolor"
        );
    }

    #[test]
    #[cfg(unix)]
    fn test_build_shell_command_has_term_program_env() {
        let cmd = build_shell_command();
        let val = cmd.get_env("TERM_PROGRAM");
        assert_eq!(
            val,
            Some(std::ffi::OsStr::new("xterm.js")),
            "TERM_PROGRAM should be set to xterm.js"
        );
    }

    #[test]
    #[cfg(unix)]
    fn test_build_shell_command_fallback_has_colorterm_env() {
        let cmd = build_shell_command_fallback();
        let val = cmd.get_env("COLORTERM");
        assert_eq!(
            val,
            Some(std::ffi::OsStr::new("truecolor")),
            "Fallback COLORTERM should be set to truecolor"
        );
    }

    #[test]
    #[cfg(unix)]
    fn test_build_shell_command_fallback_has_term_program_env() {
        let cmd = build_shell_command_fallback();
        let val = cmd.get_env("TERM_PROGRAM");
        assert_eq!(
            val,
            Some(std::ffi::OsStr::new("xterm.js")),
            "Fallback TERM_PROGRAM should be set to xterm.js"
        );
    }
}
