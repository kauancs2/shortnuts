#![cfg_attr(windows, windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::thread;
use tauri::{Builder, Manager, WindowEvent, AppHandle};
use tauri::Emitter;
use tauri_plugin_positioner::{Position, WindowExt};
use tauri_plugin_dialog::{init as DialogPlugin};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use global_hotkey::{GlobalHotKeyManager, GlobalHotKeyEvent, hotkey::{HotKey, Modifiers, Code}};
use enigo::{Enigo, KeyboardControllable, Key};
use serde::{Serialize, Deserialize};

#[cfg(target_os = "windows")]
use window_vibrancy::apply_blur;

#[derive(Debug, Clone, Serialize)]
struct HotkeyInfo {
    id: String,
    accelerator: String,
}

#[derive(Default)]
struct HotkeyState {
    hotkeys: HashMap<String, HotkeyInfo>,
}

#[derive(Debug, Deserialize)]
struct KeyCombo {
    keys: Vec<String>,
}

#[tauri::command]
fn get_available_resolutions() -> Result<Vec<(u32, u32)>, String> {
    #[cfg(target_os = "windows")]
    unsafe {
        use winapi::um::winuser::EnumDisplaySettingsA;
        use winapi::um::wingdi::DEVMODEA;

        let mut resolutions: Vec<(u32, u32)> = Vec::new();
        let mut mode_num = 0;

        loop {
            let mut devmode: DEVMODEA = std::mem::zeroed();
            devmode.dmSize = std::mem::size_of::<DEVMODEA>() as u16;

            if EnumDisplaySettingsA(std::ptr::null(), mode_num, &mut devmode) == 0 {
                break;
            }

            resolutions.push((devmode.dmPelsWidth, devmode.dmPelsHeight));
            mode_num += 1;
        }

        resolutions.sort();
        resolutions.dedup();

        Ok(resolutions)
    }

    #[cfg(not(target_os = "windows"))]
    Err("This function is only supported on Windows".to_string())
}

#[tauri::command]
fn register_global_hotkey(
    app: AppHandle,
    id: String,
    accelerator: String,
) -> Result<(), String> {
    let manager = app.state::<GlobalHotKeyManager>();
    let state = app.state::<Arc<Mutex<HotkeyState>>>();
    
    let hotkey = parse_accelerator(&accelerator)
        .map_err(|e| e.to_string())?;
    
    manager.register(hotkey.clone())
        .map_err(|e| e.to_string())?;
    
    let mut state = state.lock().unwrap();
    state.hotkeys.insert(
        id.clone(),
        HotkeyInfo { id, accelerator },
    );
    
    Ok(())
}

#[tauri::command]
fn unregister_global_hotkey(app: AppHandle, id: String) -> Result<(), String> {
    let manager = app.state::<GlobalHotKeyManager>();
    let state = app.state::<Arc<Mutex<HotkeyState>>>();
    
    let mut state = state.lock().unwrap();
    if let Some(info) = state.hotkeys.remove(&id) {
        let hotkey = parse_accelerator(&info.accelerator)
            .map_err(|e| e.to_string())?;
        manager.unregister(hotkey)
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

fn parse_accelerator(accelerator: &str) -> Result<HotKey, String> {
    let parts: Vec<&str> = accelerator.split('+').collect();
    let mut modifiers = Modifiers::empty();
    let mut key = None;
    
    for part in parts {
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "shift" => modifiers |= Modifiers::SHIFT,
            "alt" => modifiers |= Modifiers::ALT,
            "meta" | "cmd" | "command" => modifiers |= Modifiers::SUPER,
            k => {
                if key.is_some() {
                    return Err("Multiple keys specified".to_string());
                }
                key = Some(k.to_string());
            }
        }
    }
    
    let key_str = key.ok_or("No key specified")?;
    let key_code = match key_str.as_str() {
        "a" => Code::KeyA,
        "b" => Code::KeyB,
        "c" => Code::KeyC,
        "d" => Code::KeyD,
        "e" => Code::KeyE,
        "f" => Code::KeyF,
        "g" => Code::KeyG,
        "h" => Code::KeyH,
        "i" => Code::KeyI,
        "j" => Code::KeyJ,
        "k" => Code::KeyK,
        "l" => Code::KeyL,
        "m" => Code::KeyM,
        "n" => Code::KeyN,
        "o" => Code::KeyO,
        "p" => Code::KeyP,
        "q" => Code::KeyQ,
        "r" => Code::KeyR,
        "s" => Code::KeyS,
        "t" => Code::KeyT,
        "u" => Code::KeyU,
        "v" => Code::KeyV,
        "w" => Code::KeyW,
        "x" => Code::KeyX,
        "y" => Code::KeyY,
        "z" => Code::KeyZ,
        "0" => Code::Digit0,
        "1" => Code::Digit1,
        "2" => Code::Digit2,
        "3" => Code::Digit3,
        "4" => Code::Digit4,
        "5" => Code::Digit5,
        "6" => Code::Digit6,
        "7" => Code::Digit7,
        "8" => Code::Digit8,
        "9" => Code::Digit9,
        "f1" => Code::F1,
        "f2" => Code::F2,
        "f3" => Code::F3,
        "f4" => Code::F4,
        "f5" => Code::F5,
        "f6" => Code::F6,
        "f7" => Code::F7,
        "f8" => Code::F8,
        "f9" => Code::F9,
        "f10" => Code::F10,
        "f11" => Code::F11,
        "f12" => Code::F12,
        "enter" => Code::Enter,
        "escape" | "esc" => Code::Escape,
        "space" => Code::Space,
        "tab" => Code::Tab,
        "backspace" => Code::Backspace,
        "delete" => Code::Delete,
        "insert" => Code::Insert,
        "home" => Code::Home,
        "end" => Code::End,
        "pageup" => Code::PageUp,
        "pagedown" => Code::PageDown,
        "up" | "arrowup" => Code::ArrowUp,
        "down" | "arrowdown" => Code::ArrowDown,
        "left" | "arrowleft" => Code::ArrowLeft,
        "right" | "arrowright" => Code::ArrowRight,
        _ => return Err(format!("Unsupported key: {}", key_str)),
    };
    
    Ok(HotKey::new(Some(modifiers), key_code))
}

#[tauri::command]
fn open_file(path: String) {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;

        let result = Command::new("cmd")
            .args(["/C", "start", "", &path])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .creation_flags(0x08000000)
            .spawn();

        if result.is_err() {
            use std::fs::OpenOptions;
            use std::io::Write;
            let mut log_file = OpenOptions::new()
                .create(true)
                .append(true)
                .open("shortnuts.log")
                .expect("Failed to open log file");
            writeln!(log_file, "Failed to open file '{}': {:?}", path, result.err()).ok();
        }
    }
}

#[tauri::command]
fn input_keys(combo: KeyCombo) -> Result<(), String> {
    let mut enigo = Enigo::new();
    let mut modifiers = Vec::new();

    for key in &combo.keys {
        let k = key.to_lowercase();
        match k.as_str() {
            "shift" => {
                enigo.key_down(Key::Shift);
                modifiers.push(Key::Shift);
            },
            "ctrl" => {
                enigo.key_down(Key::Control);
                modifiers.push(Key::Control);
            },
            "alt" => {
                enigo.key_down(Key::Alt);
                modifiers.push(Key::Alt);
            },
            "meta" => {
                enigo.key_down(Key::Meta);
                modifiers.push(Key::Meta);
            },
            _ => {}
        }
    }

    for key in &combo.keys {
        let k = key.to_lowercase();
        match k.as_str() {
            "shift" | "ctrl" | "alt" | "meta" => continue,
            "enter" => enigo.key_click(Key::Return),
            "tab" => enigo.key_click(Key::Tab),
            "esc" => enigo.key_click(Key::Escape),
            "space" => enigo.key_click(Key::Space),
            "backspace" => enigo.key_click(Key::Backspace),
            "delete" => enigo.key_click(Key::Delete),
            "insert" => enigo.key_click(Key::Insert),
            "home" => enigo.key_click(Key::Home),
            "end" => enigo.key_click(Key::End),
            "pageup" => enigo.key_click(Key::PageUp),
            "pagedown" => enigo.key_click(Key::PageDown),
            "up" | "arrowup" => enigo.key_click(Key::UpArrow),
            "down" | "arrowdown" => enigo.key_click(Key::DownArrow),
            "left" | "arrowleft" => enigo.key_click(Key::LeftArrow),
            "right" | "arrowright" => enigo.key_click(Key::RightArrow),
            "f1" => enigo.key_click(Key::F1),
            "f2" => enigo.key_click(Key::F2),
            "f3" => enigo.key_click(Key::F3),
            "f4" => enigo.key_click(Key::F4),
            "f5" => enigo.key_click(Key::F5),
            "f6" => enigo.key_click(Key::F6),
            "f7" => enigo.key_click(Key::F7),
            "f8" => enigo.key_click(Key::F8),
            "f9" => enigo.key_click(Key::F9),
            "f10" => enigo.key_click(Key::F10),
            "f11" => enigo.key_click(Key::F11),
            "f12" => enigo.key_click(Key::F12),
            c if c.len() == 1 => {
                if let Some(ch) = c.chars().next() {
                    enigo.key_click(Key::Layout(ch));
                }
            },
            _ => (),
        }
    }

    for modifier in modifiers {
        enigo.key_up(modifier);
    }

    Ok(())
}

#[tauri::command]
fn set_resolution(width: u32, height: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    unsafe {
        use winapi::um::winuser::{ChangeDisplaySettingsA, CDS_FULLSCREEN, DISP_CHANGE_SUCCESSFUL};
        use winapi::um::wingdi::{DEVMODEA, DM_PELSWIDTH, DM_PELSHEIGHT};

        let mut devmode: DEVMODEA = std::mem::zeroed();
        devmode.dmSize = std::mem::size_of::<DEVMODEA>() as u16;
        devmode.dmPelsWidth = width;
        devmode.dmPelsHeight = height;
        devmode.dmFields = DM_PELSWIDTH | DM_PELSHEIGHT;

        let result = ChangeDisplaySettingsA(&mut devmode, CDS_FULLSCREEN);
        if result != DISP_CHANGE_SUCCESSFUL {
            return Err(format!("Failed to change resolution: code {}", result));
        }
    }

    Ok(())
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg(target_os = "windows")]
fn detach_console() {
    use windows_sys::Win32::System::Console::FreeConsole;
    unsafe {
        FreeConsole();
    }
}

#[cfg(target_os = "windows")]
fn redirect_output() {
    use std::fs::OpenOptions;
    use std::io::{self, Write};
    use std::os::windows::io::AsRawHandle;

    let nul = OpenOptions::new()
        .write(true)
        .open("NUL")
        .expect("Failed to open NUL");
    let handle = nul.as_raw_handle();
    let handle_isize = handle as isize; 
    unsafe {
        let stdout = io::stdout();
        let stderr = io::stderr();
        let _ = stdout.lock().flush();
        let _ = stderr.lock().flush();
        windows_sys::Win32::System::Console::SetStdHandle(
            windows_sys::Win32::System::Console::STD_OUTPUT_HANDLE,
            handle_isize,
        );
        windows_sys::Win32::System::Console::SetStdHandle(
            windows_sys::Win32::System::Console::STD_ERROR_HANDLE,
            handle_isize,
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    {
        detach_console();
        redirect_output();
    }

    let hotkey_manager = GlobalHotKeyManager::new().expect("Failed to create hotkey manager");
    let hotkey_state = Arc::new(Mutex::new(HotkeyState::default()));
    
    Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(DialogPlugin())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(hotkey_manager)
        .manage(hotkey_state.clone())
        .invoke_handler(tauri::generate_handler![
            open_file,
            input_keys,
            set_resolution,
            register_global_hotkey,
            unregister_global_hotkey,
            get_available_resolutions,
            quit_app
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let main_window = app.get_webview_window("main").expect("main window not found");

                #[cfg(target_os = "windows")]
                apply_blur(&main_window, Some((18, 18, 18, 125)))
                    .expect("Failed to apply blur (Windows)");

                main_window.clone().on_window_event(move |event| {
                    if let WindowEvent::Focused(false) = event {
                        let window = main_window.clone();
                        thread::spawn(move || {
                            thread::sleep(Duration::from_millis(100));
                            let _ = window.hide();
                        });
                    }
                });

                let app_handle = app.handle().clone();
                let receiver = GlobalHotKeyEvent::receiver();
                std::thread::spawn(move || {
                    for event in receiver {
                        let state = hotkey_state.lock().unwrap();
                        for (id, info) in state.hotkeys.iter() {
                            if let Ok(hotkey) = parse_accelerator(&info.accelerator) {
                                if hotkey.id() == event.id {
                                    if let Some(window) = app_handle.get_webview_window("main") {
                                        let _ = window.emit("global_hotkey_pressed", id.clone());
                                    }
                                    break;
                                }
                            }
                        }
                    }
                });

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .on_tray_icon_event(|tray_handle, event| {
                        tauri_plugin_positioner::on_tray_event(&tray_handle.app_handle(), &event);
                        match event {
                            TrayIconEvent::Click {
                                button: MouseButton::Left | MouseButton::Right,
                                button_state: MouseButtonState::Up,
                                ..
                            } => {
                                let app = tray_handle.app_handle();
                                if let Some(window) = app.webview_windows().get("main") {
                                    let _ = window.move_window(Position::TrayCenter);
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            _ => {}
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro enquanto rodava o tauri app");
}