use std::fs;
use std::path::PathBuf;

use tauri::Manager;

fn sanitize_slot_id(raw: &str) -> String {
  raw.chars()
    .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' )
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
    .invoke_handler(tauri::generate_handler![save_slot, load_slot, list_slots, delete_slot])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
