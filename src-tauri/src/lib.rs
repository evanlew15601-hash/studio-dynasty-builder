// SPDX-License-Identifier: Apache-2.0
use std::fs;
use std::path::PathBuf;

#[cfg(feature = "steam")]
use std::time::Duration;

use tauri::Manager;

struct SteamState {
  #[cfg(feature = "steam")]
  client: Option<steamworks::Client>,
}

impl SteamState {
  fn new() -> Self {
    #[cfg(feature = "steam")]
    {
      match steamworks::Client::init() {
        Ok(client) => {
          client.user_stats().request_current_stats();

          let pump = client.clone();
          std::thread::spawn(move || loop {
            pump.run_callbacks();
            std::thread::sleep(Duration::from_millis(50));
          });

          Self { client: Some(client) }
        }
        Err(_) => Self { client: None },
      }
    }

    #[cfg(not(feature = "steam"))]
    {
      Self {}
    }
  }

  fn is_available(&self) -> bool {
    #[cfg(feature = "steam")]
    {
      self.client.is_some()
    }

    #[cfg(not(feature = "steam"))]
    {
      false
    }
  }
}

#[tauri::command(rename_all = "camelCase")]
fn steam_is_available(state: tauri::State<SteamState>) -> bool {
  state.is_available()
}

#[tauri::command(rename_all = "camelCase")]
fn steam_get_persona_name(state: tauri::State<SteamState>) -> Result<String, String> {
  #[cfg(feature = "steam")]
  {
    let Some(client) = state.client.as_ref() else {
      return Err("Steam API is not available".to_string());
    };

    Ok(client.friends().name())
  }

  #[cfg(not(feature = "steam"))]
  {
    let _ = state;
    Err("Steam support is not enabled in this build".to_string())
  }
}

#[tauri::command(rename_all = "camelCase")]
fn steam_open_overlay(state: tauri::State<SteamState>, dialog: String) -> Result<(), String> {
  #[cfg(feature = "steam")]
  {
    let Some(client) = state.client.as_ref() else {
      return Err("Steam API is not available".to_string());
    };

    client.friends().activate_game_overlay(&dialog);
    Ok(())
  }

  #[cfg(not(feature = "steam"))]
  {
    let _ = (state, dialog);
    Err("Steam support is not enabled in this build".to_string())
  }
}

#[tauri::command(rename_all = "camelCase")]
fn steam_unlock_achievement(state: tauri::State<SteamState>, api_name: String) -> Result<(), String> {
  #[cfg(feature = "steam")]
  {
    let Some(client) = state.client.as_ref() else {
      return Err("Steam API is not available".to_string());
    };

    let user_stats = client.user_stats();

    for _ in 0..5 {
      user_stats.request_current_stats();
      std::thread::sleep(Duration::from_millis(200));

      if user_stats.achievement(&api_name).set().is_ok() {
        user_stats
          .store_stats()
          .map_err(|_| "Failed to store Steam stats".to_string())?;

        return Ok(());
      }
    }

    Err("Failed to set Steam achievement".to_string())
  }

  #[cfg(not(feature = "steam"))]
  {
    let _ = (state, api_name);
    Err("Steam support is not enabled in this build".to_string())
  }
}

fn sanitize_slot_id(raw: &str) -> String {
  raw.chars()
    .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
    .collect::<String>()
}

fn saves_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
  Ok(base.join("saves"))
}

fn slot_path(app: &tauri::AppHandle, slot_id: &str) -> Result<PathBuf, String> {
  let slot = sanitize_slot_id(slot_id);
  let dir = saves_dir(app)?;
  Ok(dir.join(format!("{}.json", slot)))
}

#[tauri::command]
fn get_saves_dir(app: tauri::AppHandle) -> Result<String, String> {
  let dir = saves_dir(&app)?;
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir.to_string_lossy().to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn save_slot(app: tauri::AppHandle, slot_id: String, snapshot_json: String) -> Result<(), String> {
  let dir = saves_dir(&app)?;
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

  let path = slot_path(&app, &slot_id)?;
  fs::write(path, snapshot_json).map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command(rename_all = "camelCase")]
fn load_slot(app: tauri::AppHandle, slot_id: String) -> Result<Option<String>, String> {
  let path = slot_path(&app, &slot_id)?;

  match fs::read_to_string(path) {
    Ok(contents) => Ok(Some(contents)),
    Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
    Err(err) => Err(err.to_string()),
  }
}

#[tauri::command]
fn list_slots(app: tauri::AppHandle) -> Result<Vec<String>, String> {
  let dir = saves_dir(&app)?;
  if !dir.exists() {
    return Ok(vec![]);
  }

  let mut slots = vec![];
  let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

  for entry in entries {
    let entry = entry.map_err(|e| e.to_string())?;
    let path = entry.path();

    if path.extension().and_then(|s| s.to_str()) != Some("json") {
      continue;
    }

    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
      slots.push(stem.to_string());
    }
  }

  slots.sort();
  Ok(slots)
}

#[tauri::command(rename_all = "camelCase")]
fn delete_slot(app: tauri::AppHandle, slot_id: String) -> Result<(), String> {
  let path = slot_path(&app, &slot_id)?;

  match fs::remove_file(path) {
    Ok(_) => Ok(()),
    Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(err) => Err(err.to_string()),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(SteamState::new())
    .invoke_handler(tauri::generate_handler![
      steam_is_available,
      steam_get_persona_name,
      steam_unlock_achievement,
      steam_open_overlay,
      get_saves_dir,
      save_slot,
      load_slot,
      list_slots,
      delete_slot
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
